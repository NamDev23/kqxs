-- ⚠️  CLEAN ALL DEMO DATA - Start Fresh!

DELETE FROM "AccuracyRecord";
DELETE FROM "Prediction";
DELETE FROM "SystemStats";
DELETE FROM "SystemLog";
DELETE FROM "LotteryResult";

SELECT 'Cleaned!' as status;
