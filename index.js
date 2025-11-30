const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.yhkxsiq.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("Social-events");
    const eventsCollection = db.collection("events");

    app.get('/events', async (req, res) => {
      try {
        const { eventType, search, upcoming } = req.query;

        const filter = {};

        // Filter by event type
        if (eventType && eventType !== "All") {
          filter.eventType = eventType;
        }

        // Search by title 
        if (search) {
          filter.title = { $regex: search, $options: "i" };
        }

        if (upcoming === "true") {
          const nowIso = new Date().toISOString();
          filter.eventDate = { $gte: nowIso };
        }

        const events = await eventsCollection
          .find(filter)
          .sort({ eventDate: 1 })
          .toArray();

        res.send(events);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to load events", error: err });
      }
    });

    // new event
    app.post('/events', async (req, res) => {
      try {
        const newEvent = req.body;

   
        const {
          title,
          description,
          eventType,
          thumbnail,
          location,
          eventDate,
          creatorEmail
        } = newEvent;

        if (!title || !description || !eventType || !location || !eventDate || !creatorEmail) {
          return res.status(400).send({ message: "Missing required fields" });
        }

   
        const date = new Date(eventDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(date.getTime()) || date <= today) {
          return res.status(400).send({ message: "Event date must be a future date" });
        }

        const result = await eventsCollection.insertOne({
          ...newEvent,
          joinedUsers: newEvent.joinedUsers || [],
        });

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to create event", error: err });
      }
    });


    app.get('/events/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
        if (!event) {
          return res.status(404).send({ message: "Event not found" });
        }
        res.send(event);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch event", error: err });
      }
    });

    // Join event
    app.post('/events/:id/join', async (req, res) => {
      try {
        const id = req.params.id;
        const { userEmail } = req.body;

        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $addToSet: { joinedUsers: userEmail } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Event not found" });
        }

        res.send({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to join event", error: err });
      }
    });

    // ✅ Update event
    app.put("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedEvent = req.body;

        if (updatedEvent._id) {
          delete updatedEvent._id;
        }

        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedEvent }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Event not found" });
        }

        res.send({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update event", error: err });
      }
    });

    // ✅ Delete event
    app.delete('/events/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to delete event", error: err });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
