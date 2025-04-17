import Account from "../database/models/account.js";
import Book from "../database/models/book.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
export const getUsers = async (req, res) => {
  try {
    const users = await Account.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @swagger
 * /getLoggedUser:
 *   post:
 *     summary: Kullanıcının bilgilerini döndürür
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *     responses:
 *       200:
 *         description: Başarılı bir şekilde kullanıcının bilgileri döndürüldü
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 firstName:
 *                   type: string
 *                   description: Kullanıcının adı
 *                   example: "John"
 *                 lastName:
 *                   type: string
 *                   description: Kullanıcının soyadı
 *                   example: "Doe"
 *                 email:
 *                   type: string
 *                   description: Kullanıcının email adresi
 *                   example: "john.doe@example.com"
 *                 phone:
 *                   type: string
 *                   description: Kullanıcının telefon numarası
 *                   example: "+123456789"
 *       500:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Kullanıcı bulunamadı"
 */
export const getLoggedUser = async (req, res) => {
  const { _id } = req.body;

  const user = await Account.findOne({ _id });

  if (!user) {
    return res
      .status(500)
      .json({ message: "Kullanıcı bulunamadı" });
  }

  return res.status(200).json(user.person);
};

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - person
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: Password123
 *               person:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Doe
 *                   email:
 *                     type: string
 *                     example: johndoe@example.com
 *                   phone:
 *                     type: string
 *                     example: +905551112233
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 newUser:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       500:
 *         description: Registration failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Böyle bir kullanıcı zaten mevcut.
 */
export const register = async (req, res) => {
  try {
    const { username, password, person } = req.body;
    const { firstName, lastName, email, phone } = person;

    const user = await Account.findOne({ "person.email": email });

    if (user) {
      return res
        .status(500)
        .json({ message: "Böyle bir kullanıcı zaten mevcut." });
    }

    if (password.length < 8) {
      return res
        .status(500)
        .json({ message: "Şifreniz 8 karakterden küçük olamaz." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (!isEmail(email)) {
      return res.status(500).json({ message: "Email formatında değil." });
    }

    const newUser = await Account.create({
      username,
      password: passwordHash,
      person: {
        firstName,
        lastName,
        email,
        phone,
      },
    });

    const token = jwt.sign({ id: newUser._id }, "SECRET_KEY", {
      expiresIn: "1h",
    });

    res.status(201).json({
      status: "OK",
      newUser,
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Kullanıcı girişi yapar
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Başarılı giriş
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   example: JWT_TOKEN_STRING
 *       500:
 *         description: Giriş başarısız
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Şifre yanlış
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Account.findOne({ "person.email": email });

    if (!user) {
      return res
        .status(500)
        .json({ message: "Böyle bir kullanıcı bulunamadı" });
    }

    const passwordCompare = await bcrypt.compare(password, user.password);

    if (!passwordCompare) {
      return res.status(500).json({ message: "Şifre yanlış" });
    }

    const token = jwt.sign({ id: user._id }, "SECRET_KEY", { expiresIn: "1h" });

    res.status(200).json({
      status: "OK",
      user,
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lorem" });
  }
};

/**
 * @swagger
 * /updateUserInfo:
 *   put:
 *     summary: Kullanıcı bilgilerini günceller
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *               - user
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *               user:
 *                 type: object
 *                 required:
 *                   - email
 *                   - firstName
 *                   - lastName
 *                   - phone
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: johndoe@example.com
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Doe
 *                   phone:
 *                     type: string
 *                     example: +905551112233
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Başarılı
 *       500:
 *         description: Kullanıcı bulunamadı veya güncelleme hatası
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Böyle bir kullanıcı bulunamadı
 */
export const updateUserInfo = async (req, res) => {
  const { _id } = req.body;
  const { email, firstName, lastName, phone } = req.body.user;

  const user = await Account.findOne({ _id });

  if (!user) {
    return res.status(500).json({ message: "Böyle bir kullanıcı bulunamadı" });
  }

  await Account.findOneAndUpdate(
    { _id },
    {
      $set: {
        person: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
        },
      },
    }
  );

  return res.status(200).json({ message: "Başarılı" });
};

/**
 * @swagger
 * /getBooksInCart:
 *   post:
 *     summary: Kullanıcının sepetindeki kitapları getirir
 *     tags:
 *       - Cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *     responses:
 *       200:
 *         description: Kullanıcının sepetindeki kitaplar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 books:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 *       500:
 *         description: Kullanıcı bulunamadı veya hata oluştu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Kullanıcı bulunamadı
 */
export const getBooksInCart = async (req, res) => {
  const { _id } = req.body;

  const user = await Account.findOne({ _id });

  res.status(200).json(user.books);
};

/**
 * @swagger
 * /addItemToCart:
 *   post:
 *     summary: Kullanıcının sepetine kitap ekler
 *     tags:
 *       - Cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *               - book
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *               book:
 *                 type: object
 *                 required:
 *                   - title
 *                   - price
 *                   - author
 *                 properties:
 *                   title:
 *                     type: string
 *                     description: Kitabın başlığı
 *                     example: "Örnek Kitap"
 *                   price:
 *                     type: number
 *                     description: Kitabın fiyatı
 *                     example: 19.99
 *                   author:
 *                     type: string
 *                     description: Kitabın yazarı
 *                     example: "John Doe"
 *     responses:
 *       200:
 *         description: Kitap başarıyla sepete eklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sepete kitap ekleme başarılı!"
 *       404:
 *         description: Kullanıcı veya kitap bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Kullanıcı bulunamadı."
 *       500:
 *         description: Kitap zaten sepette var
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Kitap sepette zaten mevcut, sipariş sayısını artırmak için sepete gidiniz."
 */
export const addBookToCart = async (req, res) => {
  const { _id, book } = req.body;

  const user = await Account.findOne({ _id });

  if (!user) {
    return res.status(404).json({ message: "Kullanıcı bulunamadı." });
  }

  const bookData = await Book.findOne({ title: book.title });

  if (!bookData) {
    return res.status(404).json({ message: "Kitap bulunamadı." });
  }
  let bookIndex = user.books.findIndex((el) => el.title == bookData.title);
  if (bookIndex !== -1) {
    return res.status(500).json({
      message:
        "Kitap sepette zaten mevcut sipariş sayısını artırmak için sepete gidiniz.",
    });
  }

  await Account.findOneAndUpdate({ _id }, { $push: { books: book } });
  return res.status(200).json({ message: "Sepete kitap ekleme başarılı!" });
};

/**
 * @swagger
 * /removeBookFromCart:
 *   post:
 *     summary: Kullanıcının sepetinden kitap çıkarır
 *     tags:
 *       - Cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *               - books
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *               books:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Silinmek istenen kitapların ID'leri
 *                 example: ["60f7c6b3f5f68b3d4d12f7d8", "60f7c6b3f5f68b3d4d12f7d9"]
 *     responses:
 *       200:
 *         description: Kitaplar başarıyla sepetten silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Kitap ID'si
 *                         example: "60f7c6b3f5f68b3d4d12f7d8"
 *                       title:
 *                         type: string
 *                         description: Kitap başlığı
 *                         example: "Örnek Kitap"
 *                 message:
 *                   type: string
 *                   example: "Sepetten kitap silme başarılı!"
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Kullanıcı bulunamadı."
 *       500:
 *         description: Kitap seçilmedi veya başka bir hata oluştu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lütfen silmek istediğiniz kitabı seçiniz."
 */
export const removeBookFromCart = async (req, res) => {
  const { _id, books } = req.body;

  const user = await Account.findOne({ _id });

  if (!user) {
    return res.status(404).json({ message: "Kullanıcı bulunamadı." });
  }

  if (books.length === 0) {
    return res
      .status(500)
      .json({ message: "Lütfen silmek istediğiniz kitabı seçiniz." });
  }

  user.books = user.books.filter((item) => !books.includes(item._id));

  await Account.findOneAndUpdate({ _id }, { $set: { books: user.books } });

  return res
    .status(200)
    .json({ data: user.books, message: "Sepetten kitap silme başarılı!" });
};

/**
 * @swagger
 * /getUserBalance:
 *   post:
 *     summary: Kullanıcının bakiyesini döner
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *     responses:
 *       200:
 *         description: Kullanıcının bakiyesi başarılı bir şekilde döndü
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   description: Kullanıcının bakiyesi
 *                   example: 1200.50
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Kullanıcı bulunamadı."
 *       500:
 *         description: Hata oluştu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bir hata oluştu."
 */
export const getUserBalance = async (req, res) => {
  const { _id } = req.body;

  const user = await Account.findOne({ _id });

  if (!user) {
    return res.status(404).json({ message: "Kullanıcı bulunamadı." });
  }

  return res.status(200).json(user.balance);
};

/**
 * @swagger
 * /buyBooks:
 *   post:
 *     summary: Kullanıcının kitap satın almasını sağlar ve bakiyesini günceller
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *               - totalPrice
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Kullanıcının ID'si
 *                 example: "60f7c6b3f5f68b3d4d12f7d8"
 *               totalPrice:
 *                 type: number
 *                 description: Satın alınacak kitapların toplam fiyatı
 *                 example: 500
 *     responses:
 *       200:
 *         description: Satın alma işlemi başarılı ve bakiyenin güncellendiği durum
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: number
 *                   description: Güncellenmiş bakiye
 *                   example: 700
 *                 message:
 *                   type: string
 *                   description: İşlem mesajı
 *                   example: "Satın alma işlemi başarılı!"
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Kullanıcı bulunamadı."
 *       500:
 *         description: Yetersiz bakiye veya başka bir hata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Yetersiz bakiye!"
 */
export const buyBooks = async (req, res) => {
  const { _id, totalPrice } = req.body;

  const user = await Account.findOne({_id});

  if (!user) {
    return res.status(404).json({ message: "Kullanıcı bulunamadı." });
  }

  if (user.balance < totalPrice) {
    return res.status(500).json({ message: "Yetersiz bakiye!" });
  }

  user.books = [];

  await Account.findOneAndUpdate(
    { _id },
    { $set: { balance: user.balance - totalPrice, books: user.books } }
  );

  return res
    .status(200)
    .json({ data: user.balance, message: "Satın alma işlemi başarılı!" });
};

const isEmail = (email) => {
  let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (email.match(regex)) {
    return true;
  }
  return false;
};
