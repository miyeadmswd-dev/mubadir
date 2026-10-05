const express = require("express");
const path = require("path");
const crypto = require("crypto");

const { db, hashPassword } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

function createToken() {
    return crypto.randomBytes(32).toString("hex");
}

function getUserFromToken(req) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || !sessions.has(token)) {
        return null;
    }

    return sessions.get(token);
}

function requireLogin(req, res, next) {
    const user = getUserFromToken(req);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول أولاً"
        });
    }

    req.user = user;
    next();
}

function requireAdmin(req, res, next) {
    const user = getUserFromToken(req);

    if (!user || user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "غير مصرح لك بالدخول"
        });
    }

    req.user = user;
    next();
}

// =============================
// تسجيل حساب جديد
// =============================

app.post("/api/register", (req, res) => {

    const {
        name,
        studentId,
        email,
        password,
        major
    } = req.body;

    if (!name || !studentId || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "الرجاء تعبئة جميع البيانات المطلوبة"
        });
    }

    if (!email.endsWith("@st.ut.edu.sa")) {
        return res.status(400).json({
            success: false,
            message: "يجب استخدام البريد الجامعي @st.ut.edu.sa"
        });
    }

    const hashedPassword = hashPassword(password);

    db.run(
        `
        INSERT INTO Users
        (name, student_id, email, password, major)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            name,
            studentId,
            email,
            hashedPassword,
            major || "تخصصات أخرى"
        ],
        function (err) {

            if (err) {
                return res.status(400).json({
                    success: false,
                    message: "البريد أو الرقم الجامعي مستخدم مسبقاً"
                });
            }

            res.json({
                success: true,
                message: "تم إنشاء الحساب بنجاح"
            });
        }
    );
});

// =============================
// تسجيل الدخول
// =============================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "الرجاء إدخال البريد وكلمة المرور"
        });
    }

    db.get(
        `
        SELECT *
        FROM Users
        WHERE email = ?
        `,
        [email],
        (err, user) => {

            if (err || !user) {
                return res.status(401).json({
                    success: false,
                    message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });
            }

            if (user.password !== hashPassword(password)) {
                return res.status(401).json({
                    success: false,
                    message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });
            }

            const token = createToken();

            sessions.set(token, {
                id: user.id,
                name: user.name,
                email: user.email,
                studentId: user.student_id,
                major: user.major,
                role: user.role
            });

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    studentId: user.student_id,
                    major: user.major,
                    role: user.role,
                    stars: user.stars,
                    points: user.points
                }
            });
        }
    );
});

// =============================
// تسجيل الخروج
// =============================

app.post("/api/logout", requireLogin, (req, res) => {

    const token = req.headers.authorization?.replace("Bearer ", "");

    sessions.delete(token);

    res.json({
        success: true,
        message: "تم تسجيل الخروج"
    });
});

// =============================
// بيانات المستخدم
// =============================

app.get("/api/profile", requireLogin, (req, res) => {

    db.get(
        `
        SELECT
            id,
            name,
            student_id,
            email,
            major,
            role,
            points,
            stars
        FROM Users
        WHERE id = ?
        `,
        [req.user.id],
        (err, user) => {

            if (err || !user) {
                return res.status(404).json({
                    success: false,
                    message: "المستخدم غير موجود"
                });
            }

            res.json({
                success: true,
                user
            });
        }
    );
});

// =============================
// الأندية
// =============================

app.get("/api/clubs", requireLogin, (req, res) => {

    db.all(
        `SELECT * FROM Clubs ORDER BY id`,
        [],
        (err, clubs) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "حدث خطأ"
                });
            }

            res.json({
                success: true,
                clubs
            });
        }
    );
});

// =============================
// التسجيل في نادي
// =============================

app.post("/api/clubs/:id/register", requireLogin, (req, res) => {

    const clubId = req.params.id;

    db.get(
        `
        SELECT *
        FROM Clubs
        WHERE id = ?
        `,
        [clubId],
        (err, club) => {

            if (!club) {
                return res.status(404).json({
                    success: false,
                    message: "النادي غير موجود"
                });
            }

            db.get(
                `
                SELECT id
                FROM Bookings
                WHERE user_id = ?
                AND event_id = ?
                AND booking_type = 'club'
                `,
                [req.user.id, clubId],
                (err, existing) => {

                    if (existing) {
                        return res.status(400).json({
                            success: false,
                            message: "أنت مسجل بالفعل في هذا النادي"
                        });
                    }

                    db.run(
                        `
                        INSERT INTO Bookings
                        (user_id, event_id, booking_type, status)
                        VALUES (?, ?, 'club', 'confirmed')
                        `,
                        [req.user.id, clubId],
                        function () {

                            db.run(
                                `
                                UPDATE Users
                                SET points = points + 1,
                                    stars = MIN(stars + 1, 10)
                                WHERE id = ?
                                `,
                                [req.user.id]
                            );

                            res.json({
                                success: true,
                                message: "تم التسجيل في النادي وإضافة نجمة"
                            });
                        }
                    );
                }
            );
        }
    );
});

// =============================
// الفعاليات
// =============================

app.get("/api/events", requireLogin, (req, res) => {

    db.all(
        `SELECT * FROM Events ORDER BY id`,
        [],
        (err, events) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "حدث خطأ"
                });
            }

            res.json({
                success: true,
                events
            });
        }
    );
});

// =============================
// المقاعد
// =============================

app.get("/api/events/:id/seats", requireLogin, (req, res) => {

    const eventId = req.params.id;

    db.get(
        `SELECT * FROM Events WHERE id = ?`,
        [eventId],
        (err, event) => {

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: "الفعالية غير موجودة"
                });
            }

            db.all(
                `
                SELECT seat_number
                FROM Bookings
                WHERE event_id = ?
                AND booking_type = 'seat'
                AND status = 'confirmed'
                `,
                [eventId],
                (err, rows) => {

                    const bookedSeats = rows.map(row => row.seat_number);

                    const seats = [];

                    for (let i = 1; i <= event.capacity; i++) {

                        seats.push({
                            id: i,
                            status: bookedSeats.includes(i)
                                ? "booked"
                                : "available"
                        });
                    }

                    res.json({
                        success: true,
                        seats
                    });
                }
            );
        }
    );
});

// =============================
// حجز مقعد
// =============================

app.post("/api/events/:id/seats", requireLogin, (req, res) => {

    const eventId = req.params.id;
    const seats = req.body.seats;

    if (!Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({
            success: false,
            message: "اختاري مقعداً واحداً على الأقل"
        });
    }

    if (seats.length > 2) {
        return res.status(400).json({
            success: false,
            message: "الحد الأقصى مقعدين لكل مستخدم"
        });
    }

    db.get(
        `
        SELECT *
        FROM Events
        WHERE id = ?
        `,
        [eventId],
        (err, event) => {

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: "الفعالية غير موجودة"
                });
            }

            db.all(
                `
                SELECT seat_number
                FROM Bookings
                WHERE event_id = ?
                AND booking_type = 'seat'
                AND status = 'confirmed'
                `,
                [eventId],
                (err, bookedRows) => {

                    const bookedSeats = bookedRows.map(
                        row => row.seat_number
                    );

                    const duplicate = seats.some(
                        seat => bookedSeats.includes(Number(seat))
                    );

                    if (duplicate) {
                        return res.status(400).json({
                            success: false,
                            message: "أحد المقاعد تم حجزه بالفعل"
                        });
                    }

                    seats.forEach(seat => {

                        db.run(
                            `
                            INSERT INTO Bookings
                            (user_id, event_id, booking_type, seat_number, status)
                            VALUES (?, ?, 'seat', ?, 'confirmed')
                            `,
                            [
                                req.user.id,
                                eventId,
                                Number(seat)
                            ]
                        );
                    });

                    db.run(
                        `
                        UPDATE Users
                        SET points = points + 1,
                            stars = MIN(stars + 1, 10)
                        WHERE id = ?
                        `,
                        [req.user.id]
                    );

                    res.json({
                        success: true,
                        message: "تم حجز المقاعد بنجاح وإضافة نجمة"
                    });
                }
            );
        }
    );
});

// =============================
// حجز وقت فعالية
// =============================

app.post("/api/events/:id/time", requireLogin, (req, res) => {

    const eventId = req.params.id;
    const timeSlot = req.body.timeSlot;

    if (!timeSlot) {
        return res.status(400).json({
            success: false,
            message: "اختاري وقت الحضور"
        });
    }

    db.get(
        `
        SELECT id
        FROM Bookings
        WHERE user_id = ?
        AND event_id = ?
        AND booking_type = 'time'
        AND status = 'confirmed'
        `,
        [req.user.id, eventId],
        (err, existing) => {

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "تم حجز هذه الفعالية مسبقاً"
                });
            }

            db.run(
                `
                INSERT INTO Bookings
                (user_id, event_id, booking_type, time_slot, status)
                VALUES (?, ?, 'time', ?, 'confirmed')
                `,
                [
                    req.user.id,
                    eventId,
                    timeSlot
                ],
                () => {

                    db.run(
                        `
                        UPDATE Users
                        SET points = points + 1,
                            stars = MIN(stars + 1, 10)
                        WHERE id = ?
                        `,
                        [req.user.id]
                    );

                    res.json({
                        success: true,
                        message: "تم تأكيد الحجز وإضافة نجمة"
                    });
                }
            );
        }
    );
});

// =============================
// حجوزات المستخدم
// =============================

app.get("/api/my-bookings", requireLogin, (req, res) => {

    db.all(
        `
        SELECT
            Bookings.id,
            Bookings.booking_type,
            Bookings.seat_number,
            Bookings.time_slot,
            Bookings.status,
            Bookings.created_at,
            Events.title,
            Events.college,
            Events.day,
            Events.location
        FROM Bookings
        LEFT JOIN Events
        ON Bookings.event_id = Events.id
        WHERE Bookings.user_id = ?
        AND Bookings.booking_type != 'club'
        ORDER BY Bookings.created_at DESC
        `,
        [req.user.id],
        (err, bookings) => {

            if (err) {
                return res.status(500).json({
                    success: false
                });
            }

            res.json({
                success: true,
                bookings
            });
        }
    );
});

// =============================
// أندية المستخدم
// =============================

app.get("/api/my-clubs", requireLogin, (req, res) => {

    db.all(
        `
        SELECT
            Clubs.id,
            Clubs.name,
            Clubs.supervisor,
            Clubs.description
        FROM Bookings
        JOIN Clubs
        ON Bookings.event_id = Clubs.id
        WHERE Bookings.user_id = ?
        AND Bookings.booking_type = 'club'
        AND Bookings.status = 'confirmed'
        `,
        [req.user.id],
        (err, clubs) => {

            res.json({
                success: true,
                clubs: clubs || []
            });
        }
    );
});

// =============================
// إلغاء حجز
// =============================

app.delete("/api/bookings/:id", requireLogin, (req, res) => {

    const bookingId = req.params.id;

    db.get(
        `
        SELECT *
        FROM Bookings
        WHERE id = ?
        AND user_id = ?
        `,
        [bookingId, req.user.id],
        (err, booking) => {

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "الحجز غير موجود"
                });
            }

            db.run(
                `
                UPDATE Bookings
                SET status = 'cancelled'
                WHERE id = ?
                `,
                [bookingId]
            );

            db.run(
                `
                UPDATE Users
                SET points = MAX(points - 1, 0),
                    stars = MAX(stars - 1, 0)
                WHERE id = ?
                `,
                [req.user.id]
            );

            res.json({
                success: true,
                message: "تم إلغاء الحجز"
            });
        }
    );
});

// =============================
// ADMIN
// =============================

app.get("/api/admin/users", requireAdmin, (req, res) => {

    db.all(
        `
        SELECT
            id,
            name,
            student_id,
            email,
            major,
            role,
            points,
            stars
        FROM Users
        ORDER BY id DESC
        `,
        [],
        (err, users) => {

            res.json({
                success: true,
                users
            });
        }
    );
});

app.get("/api/admin/bookings", requireAdmin, (req, res) => {

    db.all(
        `
        SELECT
            Bookings.id,
            Users.name,
            Users.email,
            Events.title,
            Events.college,
            Bookings.booking_type,
            Bookings.seat_number,
            Bookings.time_slot,
            Bookings.status,
            Bookings.created_at
        FROM Bookings
        LEFT JOIN Users
        ON Bookings.user_id = Users.id
        LEFT JOIN Events
        ON Bookings.event_id = Events.id
        ORDER BY Bookings.id DESC
        `,
        [],
        (err, bookings) => {

            res.json({
                success: true,
                bookings
            });
        }
    );
});

// إضافة نادي
app.post("/api/admin/clubs", requireAdmin, (req, res) => {

    const {
        name,
        supervisor,
        description
    } = req.body;

    db.run(
        `
        INSERT INTO Clubs
        (name, supervisor, description)
        VALUES (?, ?, ?)
        `,
        [
            name,
            supervisor,
            description
        ],
        function (err) {

            if (err) {
                return res.status(400).json({
                    success: false,
                    message: "تعذر إضافة النادي"
                });
            }

            res.json({
                success: true,
                message: "تمت إضافة النادي"
            });
        }
    );
});

// حذف نادي
app.delete("/api/admin/clubs/:id", requireAdmin, (req, res) => {

    db.run(
        `DELETE FROM Clubs WHERE id = ?`,
        [req.params.id],
        () => {

            res.json({
                success: true,
                message: "تم حذف النادي"
            });
        }
    );
});

// إضافة فعالية
app.post("/api/admin/events", requireAdmin, (req, res) => {

    const {
        title,
        college,
        day,
        duration,
        description,
        location,
        capacity,
        type
    } = req.body;

    db.run(
        `
        INSERT INTO Events
        (title, college, day, duration, description, location, capacity, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            title,
            college,
            day,
            duration,
            description || "",
            location || "",
            Number(capacity) || 30,
            type || "time"
        ],
        function (err) {

            if (err) {
                return res.status(400).json({
                    success: false,
                    message: "تعذر إضافة الفعالية"
                });
            }

            res.json({
                success: true,
                message: "تمت إضافة الفعالية"
            });
        }
    );
});

// حذف فعالية
app.delete("/api/admin/events/:id", requireAdmin, (req, res) => {

    db.run(
        `DELETE FROM Events WHERE id = ?`,
        [req.params.id],
        () => {

            res.json({
                success: true,
                message: "تم حذف الفعالية"
            });
        }
    );
});
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log("=================================");
    console.log(`منصة مبادر تعمل على: http://localhost:${PORT}`);
    console.log("=================================");
});