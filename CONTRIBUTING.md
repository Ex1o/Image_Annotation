# Contributing to VisionRapid

Thank you for your interest in contributing to VisionRapid! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment (OS, browser, Node/Python versions)

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- Why it would be useful
- Any examples or mockups (if applicable)

### Pull Requests

1. **Fork the repository**
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Write clean, readable code
   - Follow the existing code style
   - Add comments where necessary
   - Update documentation if needed
4. **Test your changes**:
   ```bash
   npm test
   npm run lint
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** with:
   - A clear title and description
   - Reference to any related issues
   - Screenshots/videos of UI changes

## Development Setup

See the [README.md](README.md) for setup instructions.

## Code Style

### Frontend (TypeScript/React)
- Use functional components with hooks
- Use TypeScript for type safety
- Follow the existing ESLint configuration
- Use Prettier for formatting
- Component names should be PascalCase
- Function names should be camelCase

### Backend (Python)
- Follow PEP 8 style guide
- Use type hints where possible
- Write docstrings for functions
- Keep functions focused and small

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example: `feat: add image export functionality`

## Code Review Process

1. All PRs require at least one approval
2. All tests must pass
3. Code must follow style guidelines
4. PRs should be focused and not too large

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

Thank you for contributing! 🎉
