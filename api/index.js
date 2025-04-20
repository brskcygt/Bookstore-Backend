import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import database from "./database/index.js";
import { userRouter } from "./routers/user.js";
import { bookRouter } from "./routers/book.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

const app = express();
const port = process.env.PORT;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Book API",
      version: "1.0.0",
      description: "A simple API for managing books",
    },
    servers: [
      {
        url: process.env.VERCEL_URL
          ? `https://${process.env.VERCELL_URL}`
          : `https://bookstore-backend-8bbr.onrender.com/`,
      },
    ],
  },
  apis: ["./controller/*.js"], // Yorumların bulunduğu dosya yolu
};

const swaggerSpec = swaggerJSDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /users:
 *  get:
 *      summary : This api is used to check if get method is working or not
 *      description : This api is used to check if get method is working or not
 *      responses:
 *          200:
 *              description : To test Get method
 */

app.use(express.json());
app.use(cors());
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use("/", userRouter);
app.use("/", bookRouter);

database();

app.listen(port || 8000, () => {
  console.log(`Server started on port ${port || 8000}`);
});
