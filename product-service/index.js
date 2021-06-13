const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const Product = require("./Product");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const isAuthenticated = require("../middlewares/isAuthenticated");
const mongo     = require('../microservices-config/mongodb');
const rabbitmq = require('../microservices-config/rabbitmq');

var order;

var channel, connection;

app.use(express.json());

mongoose.connect(mongo.url + 'product-service',{ useNewUrlParser: true, useUnifiedTopology: true}, () => {
        console.log(`Product-Service DB Connected`);
});

async function connect() {
    const amqpServer = rabbitmq.url ;
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
}
connect();

app.post("/product/buy", isAuthenticated, async (req, res) => {
    const { ids } = req.body;
    console.log("got order for following product ids", ids);
    const products = await Product.find({ _id: { $in: ids } });
    console.log("\n following products are being sneding to order service", products);
    channel.sendToQueue(
        "ORDER",
        Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            })
        )
    );
    await channel.consume("PRODUCT", (data) => {
        console.log("Consuming PRODUCT service");
        order = JSON.parse(data.content);
        console.log("acknowledgement with total amount got from product service", order);
        channel.ack(data);
    });
    console.log('sending order info to user...');
    return res.json(order);
});

app.post("/product/create", isAuthenticated, async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});


app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});
