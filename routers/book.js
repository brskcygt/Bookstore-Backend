import express from 'express';
import { createBook, deleteBook, getBook, getBooks, getBooksWithPagination } from '../controller/book.js';

export const bookRouter = express.Router();

bookRouter.get('/allBooks',getBooks);
bookRouter.get('/books', getBooksWithPagination)
bookRouter.post('/addBook',createBook);
bookRouter.get('/getBook',getBook);
bookRouter.delete('/deleteBook/:id',deleteBook);