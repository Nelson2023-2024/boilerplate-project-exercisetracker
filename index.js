const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

const { Schema } = mongoose;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const UserSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  console.log("GET /api/users");
  try {
    const users = await User.find({}).select("_id username");
    if (!users) return res.send("No users");
    res.json(users);
  } catch (error) {
    console.log("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users", async (req, res) => {
  console.log("POST /api/users");
  const userObj = new User({
    username: req.body.username,
  });
  try {
    const user = await userObj.save();
    console.log("User created:", user);
    res.json(user);
  } catch (error) {
    console.log("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  console.log("GET /api/users/:_id/logs");
  const { from, to, limit } = req.query;
  const id = req.params._id;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.send("Could not find user");
      return;
    }

    let dateObj = {};

    if (from) {
      dateObj["$gte"] = new Date(from);
    }

    if (to) {
      dateObj["$lte"] = new Date(to);
    }

    let filter = {
      user_id: id,
    };

    if (from || to) {
      filter.date = dateObj;
    }

    const exercises = await Exercise.find(filter).limit(+limit ?? 500);

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    console.log("Error fetching logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users/:id/exercises", async (req, res) => {
  console.log("POST /api/users/:id/exercises");
  const { id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.send("Could not find user");

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const exercise = await exerciseObj.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    });
  } catch (error) {
    console.log("Error saving the exercise:", error);
    res.json("Error saving the exercise: ", error);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
