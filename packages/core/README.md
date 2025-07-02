# @saas-packages/core

Core utilities and dependency injection container for SaaS packages.

## Installation

```bash
npm install @saas-packages/core
```

## Usage

```typescript
import { container, injectable, inject, ConsoleLogger } from '@saas-packages/core';

@injectable()
class MyService {
  constructor(@inject('logger') private logger: ConsoleLogger) {}
}

// Register dependencies
container.register('logger', { useClass: ConsoleLogger });
container.register(MyService, { useClass: MyService });

// Resolve
const service = container.resolve(MyService);
```
```

### Update `packages/queue-manager/README.md`:

```markdown
# @saas-packages/queue-manager

Queue management for SaaS applications using BullMQ.

## Installation

```bash
npm install @saas-packages/queue-manager
```

## Usage

```typescript
import { QueueManager, QueueServiceProvider } from '@saas-packages/queue-manager';
import { container } from '@saas-packages/core';

const queueConfig = {
  redis: { host: 'localhost', port: 6379 },
  prefix: 'myapp'
};

const provider = new QueueServiceProvider(queueConfig);
provider.register(container);

const queueManager = container.resolve('queue.manager');
```
```

### Update `packages/database-manager/README.md`:

```markdown
# @saas-packages/database-manager

Database management for SaaS applications using Prisma.

## Installation

```bash
npm install @saas-packages/database-manager
```

## Usage

```typescript
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';
import { container } from '@saas-packages/core';

const dbConfig = {
  url: 'postgresql://user:pass@localhost:5432/db',
  logQueries: true
};

const provider = new DatabaseServiceProvider(dbConfig);
provider.register(container);

const dbManager = container.resolve('database.manager');
await dbManager.connect();
```
```

## Step 4: Remove GitHub Packages Configuration

Delete the `.npmrc` files from each package directory since we're not using GitHub Packages anymore.

## Step 5: Publishing Instructions

### Manual Publishing (for testing):

1. **Login to npm:**
```bash
npm login
# Username: your-npm-username
# Password: your-npm-password
# Email: your-npm-email
```

2. **Build all packages:**
```bash
pnpm build
```

3. **Publish each package:**
```bash
cd packages/core && pnpm publish
cd ../queue-manager && pnpm publish
cd ../database-manager && pnpm publish
```

### Automated Publishing (recommended):

1. **Create an npm token:**
   - Go to npmjs.com → Account → Access Tokens
   - Generate a new token with "Automation" type
   - Copy the token

2. **Add the token to GitHub Secrets:**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN` with your npm token

3. **Create a release tag:**
```bash
git add .
git commit -m "Prepare for release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

4. **The GitHub Action will automatically publish the packages**

## Step 6: Using the Packages

### In your consuming project's `package.json`:

```json
{
  "dependencies": {
    "@saas-packages/core": "^1.0.0",
    "@saas-packages/queue-manager": "^1.0.0",
    "@saas-packages/database-manager": "^1.0.0"
  }
}
```

### Install dependencies:
```bash
npm install
# or
pnpm install
```

## Key Changes Made:

1. **Package Names**: Changed back to `@saas-packages/*` (simpler for npm)
2. **Registry**: Removed GitHub Packages configuration, using default npm registry
3. **Publish Config**: Set to `"access": "public"` for scoped packages
4. **Dependencies**: Updated to use the new package names
5. **GitHub Actions**: Updated to use npm registry and `NPM_TOKEN`
6. **License**: Changed to MIT (more permissive for npm packages)

## Important Notes:

1. **Scoped Packages**: `@saas-packages/*` packages need to be published as public (or you need a paid npm account for private packages)
2. **Authentication**: Uses `NPM_TOKEN` instead of `GITHUB_TOKEN`
3. **Registry**: Uses default npm registry instead of GitHub Packages
4. **Versioning**: Use semantic versioning (v1.0.0, v1.0.1, etc.)

Would you like me to help you implement any of these changes or explain any part in more detail?