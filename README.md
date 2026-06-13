# World Cup 2026 Predictor

A full-stack Next.js web application for predicting the 2026 FIFA World Cup. Users can predict match scores, pre-tournament awards, and group standings, while competing against others using strategic chips like "Banker" and "Rival Block".

## Features

- **Authentication & Authorization**: Secure login and registration powered by NextAuth.js, including invite tokens and admin roles.
- **Match Predictions**: Predict match scores and earn points based on accuracy.
- **Group Standing Predictions**: Interactive drag-and-drop interface (powered by `@dnd-kit`) to predict group finishes.
- **Pre-Tournament Predictions**: Pick the Golden Boot, Golden Glove, and Most Assists winners.
- **Strategic Chips**: Use special chips like "Banker", "Rival Block", "Halftime Sub", and "Goalfest" to maximize points.
- **Activity Feed**: Real-time updates on predictions, chip usage, and match results.
- **Responsive Dashboard**: Modern UI with a responsive sidebar and layout using Framer Motion animations.
- **Progressive Web App (PWA)**: Installable on mobile devices with offline support.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (v5 beta)
- **Styling**: CSS Modules / Global CSS
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **PWA**: [@ducanh2912/next-pwa](https://github.com/DuCanhGH/next-pwa)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL database

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory and add the required environment variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/wc2026pred"
AUTH_SECRET="your-nextauth-secret"
# Add any other required environment variables
```

3. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema Overview

The application uses Prisma with a PostgreSQL database. Key models include:
- `User`: Handles authentication and user profiles.
- `Fixture`: Stores World Cup match details and statuses.
- `Prediction`: User predictions for individual matches.
- `GroupStandingPrediction`: Drag-and-drop group order predictions.
- `PreTournamentPrediction`: Overall tournament award predictions.
- `Chip`: Strategic modifiers users can apply to fixtures.
- `ActivityFeedEvent`: Logs events for the global or targeted feed.

## Development Commands
- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npx prisma studio`: Open the Prisma Studio GUI to view and edit database records
