import Book from '../database/models/book.js';

/**
 * @swagger
 * /books:
 *   get:
 *     summary: Get all books (with optional pagination)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of books
 *       500:
 *         description: Server error
 */
export const getBooks = async (req, res) => {
    try {
        const books = await Book.find();
        return res.status(200).json(books);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getBooksWithPagination = async (req, res) => {
    const page = parseInt(req.query.page) || 1;         // Varsayılan sayfa 1
    const limit = parseInt(req.query.limit) || 10;      // Varsayılan 10 kayıt

    const skip = (page - 1) * limit;

    try {
        const books = await Book.find().skip(skip).limit(limit);
        const total = await Book.countDocuments();

        return res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: books,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

/**
 * @swagger
 * /addBook:
 *   post:
 *     summary: Create a new book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ISBN
 *               - title
 *             properties:
 *               ISBN:
 *                 type: string
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               author:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *               subject:
 *                 type: string
 *               summary:
 *                 type: string
 *               publisher:
 *                 type: string
 *               language:
 *                 type: string
 *               numberOfPages:
 *                 type: integer
 *               bookImg:
 *                 type: string
 *               price:
 *                 type: number
 *               format:
 *                 type: string
 *               publicationDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Book created successfully
 *       500:
 *         description: Server error
 */
export const createBook = async (req, res) => {

    const { 
        ISBN, 
        title,
        category,
        author, 
        subject,
        summary,
        publisher, 
        language, 
        numberOfPages,
        bookImg,
        price,
        format,
        publicationDate
    } = req.body;
    
    const {name,description} = author;

    try {
        const book = await Book.create({
            ISBN,
            title,
            category,
            author:{
                name,
                description
            },
            subject,
            summary,
            publisher,
            language,
            numberOfPages,
            bookImg,
            price,
            format,
            publicationDate
        });

        res.status(201).json({
            status:"OK",
            book
        })
    } catch (error) {
        res.status(500).json({message:error.message});
    }
}

/**
 * @swagger
 * /getBook:
 *   get:
 *     summary: Get a single book by ISBN
 *     parameters:
 *       - in: query
 *         name: ISBN
 *         required: true
 *         schema:
 *           type: string
 *         description: ISBN of the book
 *     responses:
 *       200:
 *         description: A book object
 *       500:
 *         description: Server error
 */
export const getBook = async (req,res) => {

    const {ISBN} = req.body;

    try {
        const book = await Book.findOne({ISBN});
        res.status(200).json(book);
    } catch (error) {
        res.status(500).json({message:error.message});
    }
}

/**
 * @swagger
 * /deleteBook/{id}:
 *   delete:
 *     summary: Delete a book by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the book
 *     responses:
 *       200:
 *         description: Book deleted
 *       500:
 *         description: Server error
 */
export const deleteBook = async (req,res) => {
    try {
        const {id} = req.params;
        await Book.findByIdAndRemove(id);
        res.status(200).json({message:"Başarılı"});
    } catch (error) {
        res.status(500).json({message:error.message});
    }
}