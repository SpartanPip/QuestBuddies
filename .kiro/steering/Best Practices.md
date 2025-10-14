# Best Practices

## Core Development Principles

### No Test Code Policy
- **NO test code should ever be written**
- Focus development time on production code quality and functionality
- Rely on manual testing and code review for quality assurance
- Avoid the overhead and complexity of test frameworks and test maintenance

### Code Simplicity
- **Code should be as simple as possible**
- Prefer straightforward, readable implementations over clever solutions
- Use clear variable and function names that express intent
- Avoid unnecessary abstractions or premature optimization
- Choose the most direct path to solve the problem

### Code Modularity
- **Code should be as modular as possible**
- Break functionality into small, focused functions and modules
- Each module should have a single, well-defined responsibility
- Minimize dependencies between modules
- Design for reusability and maintainability
- Use clear interfaces between components

## Implementation Guidelines

- Prioritize code clarity over performance unless performance is critical
- Keep functions small and focused on one task
- Use descriptive names for variables, functions, and modules
- Minimize the number of parameters in functions
- Prefer composition over inheritance
- Avoid deep nesting and complex conditional logic