# Advanced A/B Testing Calculator

A comprehensive statistical analysis tool for A/B testing with virtual user simulations, power analysis, and enterprise-grade insights.

## Features

- **Sample Size Calculator** - Calculate required sample sizes for statistically significant tests
- **Significance Test Calculator** - Analyze test results for statistical significance
- **Power Analysis Calculator** - Determine the statistical power of your tests
- **Virtual User Simulator** - Simulate user behavior and test outcomes
- **Sequential Testing Calculator** - Analyze tests with sequential data
- **Experiment Designer** - Design comprehensive A/B test experiments

## Quick Start

### Prerequisites

- Node.js 18+ installed on your system
- npm or yarn package manager

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   Or simply:
   ```bash
   npm start
   ```

3. **Open your browser:**
   The application will automatically open at `http://localhost:3000`

### Available Scripts

- `npm run dev` or `npm start` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## Technology Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Recharts** - Charting library for data visualization

## Project Structure

```
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   └── *.tsx            # Feature-specific components
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
├── styles/              # CSS styles
├── src/                 # Application entry point
└── public/              # Static assets
```

## Components Overview

- **SampleSizeCalculator** - Calculate minimum sample sizes needed
- **SignificanceTestCalculator** - Test statistical significance of results
- **PowerAnalysisCalculator** - Analyze statistical power
- **VirtualUserSimulator** - Simulate user interactions
- **SequentialTestingCalculator** - Handle sequential analysis
- **ExperimentDesigner** - Design complete experiments

## Development

The application uses modern React patterns with:
- Functional components with hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Vite for fast development and building

## Building for Production

```bash
npm run build
```

This creates a `dist/` directory with production-optimized files ready for deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is built for educational and commercial use.
