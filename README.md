# ribbit-viz

A lightweight application to visualise the tandem repeat regions reported by [ribbit](https://github.com/sowpatilab/ribbit).

## Prerequisites
- Node.js 14+ (or LTS)
- npm or yarn

## Installation
Clone the repository and install dependencies:

```bash
git clone 
cd ribbit-viz
npm install
# or
# yarn install
```

## Configuration
Create a `.env` file in the project root (if used) and add environment variables required by the app. Example:

```
REACT_APP_API_URL=http://localhost:4000
PORT=3000
```

Adjust keys to match the app's configuration.

## Running (Development)
Start the development server with hot reload:

```bash
npm start
# or
# yarn start
```

Open http://localhost:3000 (or the port configured) in your browser.

## Building (Production)
Create an optimized production build:

```bash
npm run build
# or
# yarn build
```

Serve the contents of the `build/` (or `dist/`) directory with a static server or deploy to your hosting provider.

## Testing
Run tests:

```bash
npm test
# or
# yarn test
```

Add or update tests under the `__tests__` or `tests` directory as appropriate.

Adjust scripts to match the project's tooling.

## License
Specify a license in `LICENSE` (e.g., MIT). If none, add one before distribution.

## Contact
For questions or issues, open an issue in the repository. <br>
Email: avvaruakshay@gmail.com

<!-- Replace placeholders (repo URL, scripts, env keys) with project-specific values -->