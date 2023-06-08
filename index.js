const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7em2cfy.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("artInnovators").collection("users");
    const classesCollection = client.db("artInnovators").collection("classes");
    const instructorsCollection = client
      .db("artInnovators")
      .collection("instructorClasses");

    //create users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        if (existingUser.password === user.password) {
          return res.send({
            message: "password matched.try again with another",
          });
        }
        return res.send({
          message: "user email allready exist",
        });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //get users for admin, instructor, student check
    app.get("/users", async (req, res) => {
      const query = await usersCollection.findOne({ email: req.query.email });
      res.send(query);
    });

    //users selected classes stored on database
    app.post("/classes", async (req, res) => {
      const query = req.body;
      const result = await classesCollection.insertOne(query);
      res.send(result);
    });

    //students dashboard my classes get from database
    app.get("/myclasses", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    //students dashboard my class delete from database
    app.delete("/myclass/delete/:id", async (req, res) => {
      const result = await classesCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    //all classes get from database homepage classes
    app.get("/allClasses", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result)
    });

    //add a class for instructor stored on database
    app.post("/addclass", async (req, res) => {
      const addClasses = req.body;
      const result = await instructorsCollection.insertOne(addClasses);
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Art Innovators server running");
});

app.listen(port, () => {
  console.log(`Art Innovators server running on port ${port}`);
});
