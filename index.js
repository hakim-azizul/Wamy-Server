import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const PORT = process.env.PORT 
// middleware
app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.DB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const connectedClient = await connectToMongoDB();

app.get("/", (req, res) => {
  res.send({ message: "WamyDorm Server is live" });
});


app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});