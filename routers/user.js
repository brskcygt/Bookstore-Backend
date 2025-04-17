import express from "express";
import {
  addBookToCart,
  buyBooks,
  getBooksInCart,
  getLoggedUser,
  getUserBalance,
  getUsers,
  login,
  register,
  removeBookFromCart,
  updateUserInfo,
} from "../controller/user.js";

export const userRouter = express.Router();

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

userRouter.get("/users", getUsers);
userRouter.post("/getLoggedUser", getLoggedUser);
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/getBooksInCart", getBooksInCart);
userRouter.post("/addItemToCart", addBookToCart);
userRouter.post("/removeBookFromCart", removeBookFromCart);
userRouter.post("/getUserBalance", getUserBalance);
userRouter.post("/buyBooks", buyBooks);
userRouter.post("/updateUserInfo", updateUserInfo);
