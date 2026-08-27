# 🤝 Contributing Guide

Cảm ơn bạn quan tâm đến việc đóng góp cho dự án **KQXS Analysis Pro**!

## 🎯 Nguyên Tắc Đóng Góp

### 1. Code of Conduct
- Tôn trọng mọi người
- Không spam, không toxic
- Góp ý mang tính xây dựng
- Focus vào technical discussion

### 2. Ethical Guidelines
- ⚠️ **KHÔNG** tạo features hứa hẹn "thắng chắc chắn"
- ✅ **CÓ** disclaimer rõ ràng về limitations
- ✅ **CÓ** giáo dục người dùng về xác suất
- ✅ **CÓ** promote responsible gaming

---

## 🚀 Cách Đóng Góp

### Báo Lỗi (Bug Report)
1. Check existing issues trước
2. Tạo issue mới với template:
   ```
   **Mô tả:** [Chi tiết lỗi]
   **Steps to reproduce:**
   1. ...
   2. ...
   **Expected:** [Kết quả mong đợi]
   **Actual:** [Kết quả thực tế]
   **Environment:**
   - OS: ...
   - Browser: ...
   - Version: ...
   **Screenshots:** [Nếu có]
   ```

### Đề Xuất Feature
1. Mở issue với label `enhancement`
2. Giải thích:
   - Problem: Vấn đề cần giải quyết
   - Solution: Giải pháp đề xuất
   - Alternatives: Các phương án khác
   - Ethics: Impact đạo đức (nếu có)

### Pull Request
1. Fork repo
2. Tạo branch: `feature/your-feature` hoặc `fix/bug-name`
3. Code theo style guide
4. Test kỹ
5. Commit với message rõ ràng
6. Tạo PR với description đầy đủ

---

## 💻 Development Setup

```bash
# 1. Fork & Clone
git clone https://github.com/your-username/kqxs.git
cd kqxs

# 2. Install dependencies
npm install

# 3. Create branch
git checkout -b feature/my-feature

# 4. Start dev server
npm run dev

# 5. Make changes & test

# 6. Commit
git add .
git commit -m "feat: add awesome feature"

# 7. Push & create PR
git push origin feature/my-feature
```

---

## 📝 Code Style

### TypeScript/JavaScript
```typescript
// ✅ Good
export class StatisticalAnalyzer {
  private data: LotteryResult[];
  
  constructor(data: LotteryResult[]) {
    this.data = data;
  }
  
  public analyzeFrequency(): FrequencyData[] {
    // Clear logic
    return result;
  }
}

// ❌ Bad
class analyzer {
  analyze() {
    // No types, unclear logic
  }
}
```

### React Components
```tsx
// ✅ Good
interface Props {
  data: FrequencyData[];
  onSelect?: (number: string) => void;
}

export default function FrequencyChart({ data, onSelect }: Props) {
  return <div>...</div>;
}

// ❌ Bad
export default function chart(props: any) {
  return <div>...</div>;
}
```

### Naming Conventions
- **Components:** PascalCase (`PredictionCard.tsx`)
- **Functions:** camelCase (`analyzeFrequency()`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_PREDICTIONS`)
- **Files:** kebab-case (`statistical-analyzer.ts`)

---

## 🧪 Testing

### Write Tests
```typescript
// lib/__tests__/statistical-analyzer.test.ts
describe('StatisticalAnalyzer', () => {
  it('should analyze frequency correctly', () => {
    const analyzer = new StatisticalAnalyzer(mockData);
    const result = analyzer.analyzeFrequency('last2');
    
    expect(result).toHaveLength(100);
    expect(result[0].percentage).toBeGreaterThan(0);
  });
});
```

### Run Tests
```bash
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report
```

---

## 📦 Commit Convention

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Add tests
- `chore`: Build, dependencies

**Examples:**
```bash
feat(analyzer): add neural network prediction method
fix(chart): fix tooltip overflow on mobile
docs(readme): update installation instructions
style(components): format code with prettier
refactor(api): simplify analysis endpoint
test(analyzer): add unit tests for markov chain
chore(deps): update next.js to 14.2.0
```

---

## 🔍 Code Review Process

### Reviewer Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance acceptable
- [ ] Ethical considerations addressed
- [ ] No console.log() left

### Author Checklist
- [ ] Self-review done
- [ ] Tests pass locally
- [ ] No merge conflicts
- [ ] PR description clear
- [ ] Screenshots added (if UI change)

---

## 🌳 Branch Strategy

```
main (production)
  └─ develop
      ├─ feature/new-algorithm
      ├─ feature/dark-mode
      ├─ fix/chart-overflow
      └─ refactor/api-structure
```

**Rules:**
- `main`: Always stable, deployable
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

---

## 📚 Documentation

### Update Documentation When:
- Adding new feature → Update README.md, FEATURES.md
- Changing API → Update API docs
- New configuration → Update DEPLOYMENT.md
- Algorithm changes → Explain in code comments

### Documentation Style
```markdown
## Feature Name

**Purpose:** What it does

**Usage:**
```typescript
const result = doSomething(param);
```

**Parameters:**
- `param` (type): Description

**Returns:** Type - Description

**Example:**
```typescript
// Real example
```
```

---

## 🎨 UI/UX Guidelines

### Design Principles
1. **Clarity over cleverness**
2. **Mobile-first**
3. **Accessibility (a11y) important**
4. **Performance matters**

### Colors
- Primary: Red (#dc2626) - Lottery theme
- Secondary: Green (#059669) - Positive
- Warning: Yellow (#fbbf24) - Disclaimer
- Info: Blue (#3b82f6) - Information

### Responsive Breakpoints
```css
sm: 640px   /* Mobile */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large */
```

---

## 🚀 Release Process

### Version Numbering (SemVer)
- `1.0.0` → `1.0.1`: Patch (bug fixes)
- `1.0.0` → `1.1.0`: Minor (new features)
- `1.0.0` → `2.0.0`: Major (breaking changes)

### Release Checklist
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run tests
4. Build production
5. Create Git tag
6. Deploy
7. Announce release

---

## 🤔 Need Help?

### Resources
- 📖 [Next.js Docs](https://nextjs.org/docs)
- 📖 [TypeScript Docs](https://www.typescriptlang.org/docs/)
- 📖 [Tailwind Docs](https://tailwindcss.com/docs)

### Communication
- GitHub Issues: Bug reports, feature requests
- GitHub Discussions: Q&A, ideas
- Email: [your-email] (for sensitive topics)

---

## 🏆 Recognition

Contributors được công nhận qua:
- README.md contributors section
- Git commit history
- Release notes mentions

---

## 📄 License

Bằng việc contribute, bạn đồng ý với MIT License của project.

---

**Thank you for contributing! 🎉**

Mọi đóng góp, dù lớn hay nhỏ, đều được trân trọng!
