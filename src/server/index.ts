import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, SaveLevelRequest, SaveLevelResponse, LoadLevelResponse } from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
import { createPost } from './core/post';
import { LevelHandler } from './handlers/levelHandler';
import { PostHandler } from './handlers/postHandler';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Level-related endpoints
router.post<{ postId: string }, SaveLevelResponse | { status: string; message: string }, SaveLevelRequest>(
  '/api/save-level',
  async (req, res): Promise<void> => {
    console.log('🌐 [API] POST /api/save-level - Request received');
    const { postId } = context;
    console.log('📍 [API] Context postId:', postId);
    
    if (!postId) {
      console.error('❌ [API] postId missing from context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const { levelData } = req.body;
      console.log('📦 [API] Request body received:', {
        hasLevelData: !!levelData,
        levelName: levelData?.metadata?.name,
        levelAuthor: levelData?.metadata?.author,
        tilesCount: levelData?.tiles?.length,
        enemiesCount: levelData?.enemies?.length
      });
      
      if (!levelData) {
        console.error('❌ [API] levelData missing from request body');
        res.status(400).json({
          status: 'error',
          message: 'levelData is required in request body',
        });
        return;
      }

      console.log('🚀 [API] Calling PostHandler.createLevelPost...');
      // Create a new post with the level data
      const result = await PostHandler.createLevelPost(levelData);
      
      console.log('📤 [API] Sending response:', {
        success: result.success,
        postId: result.postId,
        message: result.message
      });
      
      res.json({
        type: 'save-level',
        postId: result.postId || postId,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error('❌ [API] Error in save-level endpoint:', error);
      if (error instanceof Error) {
        console.error('❌ [API] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to save level',
      });
    }
  }
);

router.get<{ postId: string }, LoadLevelResponse | { status: string; message: string }>(
  '/api/load-level',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const result = await LevelHandler.loadLevelData(postId);
      
      res.json({
        type: 'load-level',
        postId: postId,
        levelData: result.levelData,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error('Error in load-level endpoint:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to load level',
      });
    }
  }
);

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const result = await PostHandler.createDefaultPost();

    if (result.success) {
      res.json({
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${result.postId}`,
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
      });
    }
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const result = await PostHandler.createDefaultPost();

    if (result.success) {
      res.json({
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${result.postId}`,
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
      });
    }
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
