/**
 * NEURAL NETWORK PREDICTOR
 * Sử dụng TensorFlow.js để train model dự đoán
 */

const tf = require('@tensorflow/tfjs-node');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MLPredictor {
  constructor() {
    this.model = null;
  }

  // Chuẩn bị training data
  prepareData(data) {
    console.log('📊 Preparing training data...');
    
    const sequences = [];
    const targets = [];
    
    // Sử dụng sliding window: 10 kỳ trước → predict kỳ tiếp
    for (let i = 10; i < data.length; i++) {
      const sequence = data.slice(i - 10, i);
      const target = data[i];
      
      // Encode sequence thành vector
      const seqVector = this.encodeSequence(sequence);
      const targetVector = this.encodeTarget(target);
      
      sequences.push(seqVector);
      targets.push(targetVector);
    }
    
    console.log(`  Created ${sequences.length} training samples`);
    
    return {
      xs: tf.tensor2d(sequences),
      ys: tf.tensor2d(targets)
    };
  }

  encodeSequence(sequence) {
    // Encode 10 kỳ thành vector features
    const features = [];
    
    sequence.forEach(record => {
      // Feature 1: Đề (2 số cuối ĐB) → normalize 0-99
      const de = parseInt(record.special.slice(-2));
      features.push(de / 99);
      
      // Feature 2: 3 càng (3 số cuối ĐB) → normalize 0-999
      const bacang = parseInt(record.special.slice(-3));
      features.push(bacang / 999);
      
      // Feature 3: Tổng các giải → normalize
      const allNums = [record.special, ...record.first, ...record.second,
                       ...record.third, ...record.fourth, ...record.fifth,
                       ...record.sixth, ...record.seventh];
      const sum = allNums.reduce((s, n) => s + parseInt(n), 0);
      features.push(sum / 1000000);
      
      // Feature 4: Số lượng chữ số chẵn
      const evenCount = allNums.filter(n => parseInt(n) % 2 === 0).length;
      features.push(evenCount / allNums.length);
    });
    
    return features;
  }

  encodeTarget(record) {
    // Target: One-hot encoding cho đề (00-99)
    const de = parseInt(record.special.slice(-2));
    const oneHot = new Array(100).fill(0);
    oneHot[de] = 1;
    return oneHot;
  }

  // Build Neural Network
  buildModel() {
    console.log('🏗️  Building Neural Network...');
    
    this.model = tf.sequential({
      layers: [
        // Input layer: 10 sequences * 4 features = 40 inputs
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [40]
        }),
        
        // Hidden layer 1 với dropout
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        
        // Hidden layer 2
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        
        // Output layer: 100 neurons (00-99)
        tf.layers.dense({
          units: 100,
          activation: 'softmax'
        })
      ]
    });
    
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    console.log('  ✅ Model architecture:');
    this.model.summary();
  }

  // Train model
  async trainModel(data) {
    console.log('\n🎓 Training Neural Network...');
    
    const { xs, ys } = this.prepareData(data);
    
    console.log('  Input shape:', xs.shape);
    console.log('  Output shape:', ys.shape);
    
    const history = await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 16,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if ((epoch + 1) % 10 === 0) {
            console.log(`  Epoch ${epoch + 1}/50: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}`);
          }
        }
      }
    });
    
    const finalAcc = history.history.acc[history.history.acc.length - 1];
    console.log(`\n  ✅ Training complete! Final accuracy: ${(finalAcc * 100).toFixed(2)}%`);
    
    xs.dispose();
    ys.dispose();
  }

  // Predict
  async predict(recentData) {
    console.log('\n🔮 Generating predictions...');
    
    // Encode 10 kỳ gần nhất
    const sequence = this.encodeSequence(recentData.slice(0, 10));
    const input = tf.tensor2d([sequence]);
    
    // Predict
    const prediction = this.model.predict(input);
    const probabilities = await prediction.data();
    
    // Get top 10 most probable numbers
    const probs = Array.from(probabilities)
      .map((prob, idx) => ({ num: String(idx).padStart(2, '0'), prob }))
      .sort((a, b) => b.prob - a.prob);
    
    input.dispose();
    prediction.dispose();
    
    console.log('  Top 10 predictions:');
    probs.slice(0, 10).forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.num}: ${(p.prob * 100).toFixed(2)}%`);
    });
    
    return probs.slice(0, 10).map(p => p.num);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   🤖 NEURAL NETWORK ML PREDICTOR                              ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const data = await prisma.lotteryResult.findMany({
    orderBy: { date: 'desc' },
    take: 100
  });

  console.log(`📊 Loaded: ${data.length} days\n`);

  const predictor = new MLPredictor();
  
  // Build model
  predictor.buildModel();
  
  // Train
  await predictor.trainModel(data);
  
  // Predict
  const predictions = await predictor.predict(data);
  
  console.log('\n✅ ML Predictions:', predictions);
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ NEURAL NETWORK TRAINING COMPLETE                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await prisma.$disconnect();
  process.exit(0);
}

main();
