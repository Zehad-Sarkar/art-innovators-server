const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
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
    // await client.connect();

    const usersCollection = client.db("artInnovators").collection("users");
    const classesCollection = client.db("artInnovators").collection("classes");
    const instructorsCollection = client
      .db("artInnovators")
      .collection("instructorClasses");
    const paymentsCollection = client
      .db("artInnovators")
      .collection("payments");
    const enrolledCollection = client
      .db("artInnovators")
      .collection("enrolled");
    const feedbackCollection = client
      .db("artInnovators")
      .collection("feedback");

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
      const result = await classesCollection
        .find({ email: req.query.email })
        .toArray();
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
      res.send(result);
    });

    //add a class for instructor stored on database
    app.post("/addclass", async (req, res) => {
      const addClasses = req.body;
      const result = await instructorsCollection.insertOne(addClasses);
      res.send(result);
    });

    //get instructor classes for instructor dashboard my class
    app.get("/myclass", async (req, res) => {
      const email = { email: req.query.email };
      const result = await instructorsCollection.find(email).toArray();
      res.send(result);
    });

    //load all users for admin manage users
    app.get("/allUsers", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //updating user role make admin by update from admin dashboard by admin
    app.put("/makeAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //updating user role make instructor by update dashboard by admin
    app.put("/makeInstructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //load instructors classes for manage classes by admin in admin dashboard
    app.get("/manageClasses", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    //stored feedback
    app.post("/feedback", async (req, res) => {
      const result = await feedbackCollection.insertOne(req.body);
      res.send(result);
    });

    //payment stipe impliment here
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //payment api to save database ,remove classes ,enrolled added
    app.post("/payments", async (req, res) => {
      const paymentInfo = req.body;
      const insertResult = await paymentsCollection.insertOne(paymentInfo);
      const query = {
        _id: { $in: paymentInfo.classesId.map((id) => new ObjectId(id)) },
      };
      const removeResult = await classesCollection.deleteMany(query);
      const enrolledResult = await enrolledCollection.insertOne(paymentInfo);
      res.send({ insertResult, removeResult, enrolledResult });
    });

    //enrolled classes get from database
    app.get("/enrolledClasses", async (req, res) => {
      const result = await enrolledCollection
        .find({ email: req.query.email })
        .toArray();
      res.send(result);
    });

    //total enroll classes by classes name
    app.get("/enrolledNumber", async (req, res) => {
      const classesName = req.query.classesName;
      const query = { classesName: classesName };
      const result = await enrolledCollection.find(query).toArray();
      res.send(result);
    });

    //update class
    app.patch("/dashboard/updateClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const newUpdates = req.body;
      const updateDoc = {
        $set: {
          price: newUpdates.price,
          image: newUpdates.image,
          classesName: newUpdates.classesName,
          seats: newUpdates.seats,
        },
      };
      const result = await instructorsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //data load for payment history
    app.get("/paymentHistory", async (req, res) => {
      const result = await paymentsCollection
        .find({ email: req.query.email })
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
