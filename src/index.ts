import express from 'express';
import path from 'path';
import cors from 'cors';
import { MongoClient, MongoError } from 'mongodb';
import Joi from 'joi';

const app = express();
const htmlPort = 50000;
const jsPort = 8888;

const publicDirPath = path.resolve(process.cwd(), 'public');
const distDirPath = path.resolve(process.cwd(), 'dist');

app.use(cors());
app.use(express.static(publicDirPath));
app.use(express.json());

const eventSchema = Joi.object({
  event: Joi.string().required(),
  tags: Joi.array().items(Joi.string()),
  url: Joi.string().required(),
  title: Joi.string().required(),
  ts: Joi.number().integer().required(),
});

async function startServer() {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017', {
      connectTimeoutMS: 5000,
    });
    const db = client.db('activity-track');

    const collectionExists = await db
      .listCollections({ name: 'tracks' })
      .hasNext();

    if (!collectionExists) {
      await db.createCollection('tracks');
    }

    const tracksCollection = db.collection('tracks');

    app.get(/^\/[123]\.html$/, (req, res) => {
      res.sendFile(path.join(publicDirPath, 'index.html'));
    });

    app.get('/tracker', (req, res) => {
      res.sendFile(path.join(distDirPath, 'client', 'tracker.js'));
    });

    app.post('/track', async (req, res) => {
      const events = req.body;
      const { error } = Joi.array().items(eventSchema).validate(events);

      if (error) {
        return res.status(422).send();
      }

      res.status(200).send();

      if (events.length === 1) {
        await tracksCollection.insertOne(events[0]);
      } else {
        await tracksCollection.insertMany(events);
      }
    });

    app.listen(htmlPort, () => {
      console.log(`Server is listening on port ${htmlPort}`);
    });

    app.listen(jsPort, () => {
      console.log(`Server is listening on port ${jsPort}`);
    });

    process.on('SIGINT', async () => {
      console.log('Server is shutting down.');
      try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof MongoError) {
      console.error('MongoDB Error Code:', error.code);
    }

    process.exit(1);
  }
}

startServer();
