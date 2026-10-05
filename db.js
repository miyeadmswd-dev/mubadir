const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const db = new sqlite3.Database("./tu_events.db");

function hashPassword(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

db.serialize(() => {

    // جدول المستخدمين
    db.run(`
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            student_id TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            major TEXT DEFAULT 'تخصصات أخرى',
            role TEXT CHECK(role IN ('student', 'organizer', 'admin')) DEFAULT 'student',
            points INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // جدول الأندية
    db.run(`
        CREATE TABLE IF NOT EXISTS Clubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            supervisor TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // جدول الفعاليات
    db.run(`
        CREATE TABLE IF NOT EXISTS Events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            college TEXT NOT NULL,
            day TEXT NOT NULL,
            duration TEXT NOT NULL,
            description TEXT DEFAULT '',
            location TEXT DEFAULT '',
            capacity INTEGER DEFAULT 30,
            type TEXT DEFAULT 'time',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // جدول الحجوزات
    db.run(`
        CREATE TABLE IF NOT EXISTS Bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            booking_type TEXT DEFAULT 'time',
            seat_number INTEGER,
            time_slot TEXT,
            status TEXT DEFAULT 'confirmed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES Users(id),
            FOREIGN KEY(event_id) REFERENCES Events(id)
        )
    `);

    // إضافة حساب Admin افتراضي
    db.get(
        `SELECT id FROM Users WHERE email = ?`,
        ["admin@ut.edu.sa"],
        (err, row) => {
            if (!row) {
                db.run(
                    `
                    INSERT INTO Users
                    (name, student_id, email, password, major, role, points, stars)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        "مشرف النظام",
                        "ADMIN001",
                        "admin@ut.edu.sa",
                        hashPassword("Admin123!"),
                        "إدارة",
                        "admin",
                        0,
                        0
                    ]
                );
            }
        }
    );

    // الأندية الأساسية
    const clubs = [
        ["نادي الحاسبات", "د. أمل البلوي", "تطوير مهارات البرمجة وتطبيقات الويب المتقدمة."],
        ["نادي التصميم", "أ. ريم الجهني", "إتقان برمجيات التصميم الجرافيكي وتصميم واجهات المستخدم."],
        ["نادي العمل التطوعي", "د. فاطمة العمري", "نشر ثقافة العمل الإنساني وخدمة المجتمع."],
        ["نادي الفنون", "أ. نورة الحويطي", "إبراز المواهب الفنية في الرسم والخط العربي."],
        ["نادي القراءة والثقافة", "د. مها البلوي", "تشجيع الطالبات على القراءة والنقاش الثقافي."],
        ["نادي الذكاء الاصطناعي", "أ. سارة الشمري", "استكشاف تقنيات الذكاء الاصطناعي والبيانات الضخمة."],
        ["نادي ريادة الأعمال", "د. هيفاء العنزي", "تحويل الأفكار الابتكارية إلى مشاريع ريادية ناجحة."],
        ["نادي اللغات والترجمة", "أ. خلود العطوي", "تعزيز مهارات التحدث باللغات العالمية."],
        ["نادي الأمن السيبراني", "د. أروى البلوي", "رفع الوعي بالأمن الرقمي وحماية البيانات."],
        ["نادي المناظرات والخطابة", "أ. ابتسام الحارثي", "صقل مهارات الإلقاء والحوار الراقي."]
    ];

    clubs.forEach(club => {
        db.run(
            `
            INSERT OR IGNORE INTO Clubs
            (name, supervisor, description)
            VALUES (?, ?, ?)
            `,
            club
        );
    });

    // الفعاليات الأساسية
    const events = [
        ["مسرحية التوعية الصحية", "كلية الطب", "الأحد", "ساعتان (مسرح)", "مسرحية توعوية صحية", "مسرح الجامعة", 30, "seat"],
        ["فعالية الفحص الطبي وسحب الدم", "كلية الصيدلة", "الثلاثاء", "30 دقيقة", "فعالية للفحص الطبي", "كلية الصيدلة", 30, "time"],
        ["الفعالية الترحيبية للمستجدات", "كلية الحاسبات", "الخميس", "30 دقيقة", "فعالية ترحيبية للطالبات المستجدات", "القاعة الرئيسية", 30, "time"],
        ["معرض الابتكار الهندسي", "كلية الهندسة", "الإثنين", "30 دقيقة", "عرض الابتكارات والمشاريع الهندسية", "كلية الهندسة", 30, "time"],
        ["معرض التصميم الرقمي والإبداعي", "كلية التصميم", "الأربعاء", "30 دقيقة", "معرض للمشاريع والتصاميم الإبداعية", "كلية التصميم", 30, "time"],
        ["منتدى الاستشارات القانونية", "كلية القانون", "الأحد", "30 دقيقة", "منتدى للاستشارات القانونية", "كلية القانون", 30, "time"],
        ["مسابقة الأولمبياد الرياضي والذهني", "كلية الرياضيات", "الثلاثاء", "30 دقيقة", "مسابقة رياضية وذهنية", "كلية الرياضيات", 30, "time"],
        ["الملتقى العلمي لعلوم البيانات", "كلية علوم الحاسب", "الخميس", "30 دقيقة", "ملتقى علمي متخصص في علوم البيانات", "كلية علوم الحاسب", 30, "time"],
        ["ورشة صناعة الأدوية والتركيبات", "كلية الصيدلة", "الإثنين", "30 دقيقة", "ورشة حول صناعة الأدوية", "كلية الصيدلة", 30, "time"],
        ["معرض الروبوتات والأنظمة الذكية", "كلية الهندسة", "الأربعاء", "30 دقيقة", "معرض للروبوتات والأنظمة الذكية", "كلية الهندسة", 30, "time"]
    ];

    events.forEach(event => {
        db.run(
            `
            INSERT OR IGNORE INTO Events
            (title, college, day, duration, description, location, capacity, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            event
        );
    });
});

module.exports = {
    db,
    hashPassword
};