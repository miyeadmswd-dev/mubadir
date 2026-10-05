let token = localStorage.getItem("token") || "";

let currentUser = null;

let currentClubId = null;

let currentEvent = null;

let selectedTheaterSeats = [];

const API = "/api";


// =============================
// أدوات عامة
// =============================

function showToast(message) {

    const container =
        document.getElementById("toastContainer");

    const toast =
        document.createElement("div");

    toast.className = "toast";

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}


async function api(url, options = {}) {

    options.headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        options.headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(API + url, options);

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "حدث خطأ"
        );
    }

    return data;
}


// =============================
// تشغيل الموقع
// =============================

window.onload = async function () {

    if (
        localStorage.getItem("darkMode") === "true"
    ) {
        document.body.classList.add("dark-mode");
    }

    if (token) {

        try {

            await loadProfile();

            showMainPage();

        } catch (error) {

            token = "";

            localStorage.removeItem("token");

        }
    }

    updateStars();
};


// =============================
// تسجيل الدخول
// =============================

document
    .getElementById("loginForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const error =
            document.getElementById("error-msg");

        error.textContent = "";

        try {

            const result =
                await api("/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email,
                        password
                    })
                });

            token = result.token;

            localStorage.setItem(
                "token",
                token
            );

            currentUser = result.user;

            showMainPage();

            showToast(
                "تم تسجيل الدخول بنجاح أهلاً بكِ!"
            );

        } catch (err) {

            error.textContent =
                err.message;
        }
    });


// =============================
// إنشاء حساب
// =============================

function openRegisterModal() {

    document
        .getElementById("registerModal")
        .classList.remove("hidden");
}


async function registerUser() {

    const name =
        document
            .getElementById("registerName")
            .value
            .trim();

    const studentId =
        document
            .getElementById("registerStudentId")
            .value
            .trim();

    const email =
        document
            .getElementById("registerEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("registerPassword")
            .value;

    const major =
        document
            .getElementById("registerMajor")
            .value;

    if (
        !name ||
        !studentId ||
        !email ||
        !password
    ) {

        showToast(
            "الرجاء تعبئة جميع البيانات"
        );

        return;
    }

    try {

        await api("/register", {
            method: "POST",
            body: JSON.stringify({
                name,
                studentId,
                email,
                password,
                major
            })
        });

        showToast(
            "تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن"
        );

        closeModals();

    } catch (err) {

        showToast(err.message);
    }
}


// =============================
// عرض الصفحة الرئيسية
// =============================

function showMainPage() {

    document
        .getElementById("loginSection")
        .classList.add("hidden");

    document
        .getElementById("mainNavbar")
        .classList.remove("hidden");

    document
        .getElementById("homeSection")
        .classList.remove("hidden");

    document.body.classList.remove(
        "login-bg"
    );

    if (currentUser) {

        document
            .getElementById("welcomeUserName")
            .textContent =
            currentUser.name;

        if (
            currentUser.role === "admin"
        ) {

            document
                .getElementById("adminButton")
                .classList.remove("hidden");
        }
    }

    loadClubs();

    loadEvents();

    updateStars();
}


// =============================
// تسجيل الخروج
// =============================

async function logout() {

    try {

        await api("/logout", {
            method: "POST"
        });

    } catch (error) {}

    token = "";

    currentUser = null;

    localStorage.removeItem("token");

    document
        .getElementById("mainNavbar")
        .classList.add("hidden");

    document
        .getElementById("homeSection")
        .classList.add("hidden");

    document
        .getElementById("clubsSection")
        .classList.add("hidden");

    document
        .getElementById("eventsSection")
        .classList.add("hidden");

    document
        .getElementById("loginSection")
        .classList.remove("hidden");

    document.body.classList.add(
        "login-bg"
    );

    showToast(
        "تم تسجيل الخروج بنجاح"
    );
}


// =============================
// الملف الشخصي
// =============================

async function loadProfile() {

    const result =
        await api("/profile");

    currentUser =
        result.user;

    updateStars();
}


function updateStars() {

    const stars =
        currentUser?.stars || 0;

    const count =
        document.getElementById("starCount");

    if (count) {
        count.textContent = stars;
    }

    const starElements =
        document.querySelectorAll(
            ".stars-container .star"
        );

    starElements.forEach(
        (star, index) => {

            star.classList.toggle(
                "active",
                index < stars
            );
        }
    );
}


async function openProfileModal() {

    try {

        const profile =
            await api("/profile");

        currentUser =
            profile.user;

        document
            .getElementById("profileName")
            .textContent =
            currentUser.name;

        document
            .getElementById("profileStudentId")
            .textContent =
            currentUser.student_id;

        document
            .getElementById("profileEmail")
            .textContent =
            currentUser.email;

        document
            .getElementById("profileMajor")
            .textContent =
            currentUser.major;

        document
            .getElementById("profilePoints")
            .textContent =
            currentUser.points;

        document
            .getElementById("profileStars")
            .textContent =
            currentUser.stars;

        await loadProfileClubs();

        await loadProfileEvents();

        document
            .getElementById("profileModal")
            .classList.remove("hidden");

    } catch (error) {

        showToast(error.message);
    }
}


async function loadProfileClubs() {

    const result =
        await api("/my-clubs");

    const container =
        document.getElementById(
            "profileClubsList"
        );

    if (!result.clubs.length) {

        container.innerHTML =
            `<p class="gray-info">
                لم تقومي بالانضمام لأي نادي بعد.
            </p>`;

        return;
    }

    container.innerHTML =
        result.clubs.map(
            club => `
                <div class="profile-item">
                    <span>🎓 ${club.name}</span>
                </div>
            `
        ).join("");
}


async function loadProfileEvents() {

    const result =
        await api("/my-bookings");

    const container =
        document.getElementById(
            "profileEventsList"
        );

    if (!result.bookings.length) {

        container.innerHTML =
            `<p class="gray-info">
                لم تقومي بحجز أي فعالية بعد.
            </p>`;

        return;
    }

    container.innerHTML =
        result.bookings.map(
            booking => `
                <div class="profile-item">

                    <div>
                        <strong>
                            ${booking.title}
                        </strong>

                        <br>

                        <small>
                            ${booking.college}
                        </small>

                        ${
                            booking.seat_number
                            ? `<br>مقعد: ${booking.seat_number}`
                            : ""
                        }

                        ${
                            booking.time_slot
                            ? `<br>الوقت: ${booking.time_slot}`
                            : ""
                        }
                    </div>

                    <button
                        class="cancel-small"
                        onclick="cancelBooking(${booking.id})"
                    >
                        إلغاء
                    </button>

                </div>
            `
        ).join("");
}


// =============================
// إلغاء الحجز
// =============================

async function cancelBooking(id) {

    try {

        await api(
            `/bookings/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadProfile();

        showToast(
            "تم إلغاء الحجز"
        );

        openProfileModal();

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// الأندية
// =============================

async function loadClubs() {

    try {

        const result =
            await api("/clubs");

        const container =
            document.getElementById(
                "clubsContainer"
            );

        container.innerHTML =
            result.clubs.map(
                club => `
                    <div class="item-card">

                        <span class="badge">
                            نادي طلابي
                        </span>

                        <h3>
                            ${club.name}
                        </h3>

                        <p>
                            <strong>
                                المشرفة:
                            </strong>

                            ${club.supervisor}
                        </p>

                        <p>
                            ${club.description}
                        </p>

                        <button
                            class="btn-book"
                            onclick="openClubModal(
                                ${club.id},
                                '${escapeText(club.name)}',
                                '${escapeText(club.supervisor)}',
                                '${escapeText(club.description)}'
                            )"
                        >
                            عرض التفاصيل والتسجيل
                        </button>

                    </div>
                `
            ).join("");

    } catch (error) {

        showToast(
            error.message
        );
    }
}


function escapeText(text) {

    return String(text)
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;");
}


function openClubModal(
    id,
    name,
    supervisor,
    description
) {

    currentClubId = id;

    document
        .getElementById("clubModalTitle")
        .textContent = name;

    document
        .getElementById("clubSupervisor")
        .textContent =
        supervisor;

    document
        .getElementById("clubModalDesc")
        .textContent =
        description;

    document
        .getElementById("userGoal")
        .value = "";

    document
        .getElementById("clubModal")
        .classList.remove("hidden");
}


async function confirmClubRegistration() {

    const goal =
        document
            .getElementById("userGoal")
            .value
            .trim();

    if (!goal) {

        showToast(
            "الرجاء كتابة هدفك من دخول النادي"
        );

        return;
    }

    try {

        const result =
            await api(
                `/clubs/${currentClubId}/register`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        goal
                    })
                }
            );

        await loadProfile();

        closeModals();

        showToast(
            result.message
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// الفعاليات
// =============================

let allEvents = [];


async function loadEvents() {

    try {

        const result =
            await api("/events");

        allEvents =
            result.events;

        renderEvents(
            allEvents
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


function renderEvents(events) {

    const container =
        document.getElementById(
            "eventsGridContainer"
        );

    container.innerHTML =
        events.map(
            event => {

                const isTheater =
                    event.type === "seat";

                return `
                    <div
                        class="event-card"
                        data-title="${event.title}"
                        data-day="${event.day}"
                    >

                        <span class="badge">
                            ${event.college}
                        </span>

                        <h3>
                            ${event.title}
                        </h3>

                        <p>
                            <strong>
                                اليوم:
                            </strong>
                            ${event.day}
                        </p>

                        <p>
                            <strong>
                                المدة:
                            </strong>
                            ${event.duration}
                        </p>

                        <p>
                            <strong>
                                المكان:
                            </strong>
                            ${event.location}
                        </p>

                        <button
                            class="details-btn"
                            onclick="openEventDetails(${event.id})"
                        >
                            عرض التفاصيل
                        </button>

                        <button
                            class="btn-book"
                            onclick="${
                                isTheater
                                ? `openTheaterModal(${event.id})`
                                : `openTimeSlotModal(${event.id})`
                            }"
                        >
                            ${
                                isTheater
                                ? "اختيار مقعد المسرح"
                                : "اختر وقت الحضور"
                            }
                        </button>

                    </div>
                `;
            }
        ).join("");
}


function filterEvents() {

    const search =
        document
            .getElementById(
                "eventSearchInput"
            )
            .value
            .toLowerCase();

    const day =
        document
            .getElementById(
                "eventDayFilter"
            )
            .value;

    const filtered =
        allEvents.filter(
            event => {

                const text =
                    (
                        event.title +
                        " " +
                        event.college +
                        " " +
                        event.description
                    ).toLowerCase();

                return (
                    text.includes(search) &&
                    (
                        !day ||
                        event.day === day
                    )
                );
            }
        );

    renderEvents(filtered);
}


// =============================
// تفاصيل الفعالية
// =============================

function openEventDetails(id) {

    const event =
        allEvents.find(
            e => e.id === id
        );

    if (!event) return;

    currentEvent =
        event;

    document
        .getElementById(
            "eventDetailsTitle"
        )
        .textContent =
        event.title;

    document
        .getElementById(
            "eventDetailsCollege"
        )
        .textContent =
        event.college;

    document
        .getElementById(
            "eventDetailsDay"
        )
        .textContent =
        event.day;

    document
        .getElementById(
            "eventDetailsDuration"
        )
        .textContent =
        event.duration;

    document
        .getElementById(
            "eventDetailsLocation"
        )
        .textContent =
        event.location;

    document
        .getElementById(
            "eventDetailsDescription"
        )
        .textContent =
        event.description;

    const button =
        document.getElementById(
            "eventDetailsBookButton"
        );

    button.onclick =
        () => {

            closeModals();

            if (
                event.type === "seat"
            ) {

                openTheaterModal(
                    event.id
                );

            } else {

                openTimeSlotModal(
                    event.id
                );
            }
        };

    document
        .getElementById(
            "eventDetailsModal"
        )
        .classList.remove("hidden");
}


// =============================
// المسرح والمقاعد
// =============================

let theaterEventId = null;


async function openTheaterModal(eventId) {

    theaterEventId =
        eventId;

    selectedTheaterSeats =
        [];

    try {

        const result =
            await api(
                `/events/${eventId}/seats`
            );

        renderTheaterSeats(
            result.seats
        );

        document
            .getElementById(
                "theaterModal"
            )
            .classList.remove("hidden");

    } catch (error) {

        showToast(
            error.message
        );
    }
}


function renderTheaterSeats(seats) {

    const container =
        document.getElementById(
            "theaterSeatsContainer"
        );

    container.innerHTML = "";

    const available =
        seats.filter(
            seat =>
                seat.status === "available"
        ).length;

    document
        .getElementById(
            "theaterStatusText"
        )
        .textContent =
        `المقاعد المتاحة: ${available} | يمكنك حجز مقعدين كحد أقصى`;

    seats.forEach(
        seat => {

            const div =
                document.createElement("div");

            div.textContent =
                `مقعد ${seat.id}`;

            div.className =
                "seat";

            if (
                seat.status === "booked"
            ) {

                div.classList.add(
                    "booked"
                );

            } else if (
                selectedTheaterSeats.includes(
                    seat.id
                )
            ) {

                div.classList.add(
                    "selected"
                );

                div.onclick =
                    () =>
                        toggleSeat(
                            seat.id,
                            seats
                        );

            } else {

                div.classList.add(
                    "available"
                );

                div.onclick =
                    () =>
                        toggleSeat(
                            seat.id,
                            seats
                        );
            }

            container.appendChild(div);
        }
    );
}


function toggleSeat(
    id,
    seats
) {

    const index =
        selectedTheaterSeats.indexOf(id);

    if (index !== -1) {

        selectedTheaterSeats.splice(
            index,
            1
        );

    } else {

        if (
            selectedTheaterSeats.length >= 2
        ) {

            showToast(
                "الحد الأقصى مقعدين فقط"
            );

            return;
        }

        selectedTheaterSeats.push(id);
    }

    renderTheaterSeats(
        seats
    );
}


async function confirmTheaterBooking() {

    if (
        selectedTheaterSeats.length === 0
    ) {

        showToast(
            "اختاري مقعداً واحداً على الأقل"
        );

        return;
    }

    try {

        const result =
            await api(
                `/events/${theaterEventId}/seats`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        seats:
                            selectedTheaterSeats
                    })
                }
            );

        await loadProfile();

        selectedTheaterSeats = [];

        closeModals();

        showToast(
            result.message
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// حجز الوقت
// =============================

let timeEventId = null;


function openTimeSlotModal(eventId) {

    timeEventId =
        eventId;

    const event =
        allEvents.find(
            e => e.id === eventId
        );

    if (event) {

        document
            .getElementById(
                "modalEventTitle"
            )
            .textContent =
            `حجز: ${event.title}`;
    }

    document
        .getElementById(
            "timeModal"
        )
        .classList.remove("hidden");
}


async function confirmTimeSlot() {

    const timeSlot =
        document
            .getElementById(
                "timeSlotSelect"
            )
            .value;

    try {

        const result =
            await api(
                `/events/${timeEventId}/time`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        timeSlot
                    })
                }
            );

        await loadProfile();

        closeModals();

        showToast(
            result.message
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// التنقل
// =============================

function goToSection(
    section
) {

    document
        .getElementById("homeSection")
        .classList.add("hidden");

    document
        .getElementById("clubsSection")
        .classList.add("hidden");

    document
        .getElementById("eventsSection")
        .classList.add("hidden");

    if (
        section === "clubs"
    ) {

        document
            .getElementById("clubsSection")
            .classList.remove("hidden");

        loadClubs();

    }

    if (
        section === "events"
    ) {

        document
            .getElementById("eventsSection")
            .classList.remove("hidden");

        loadEvents();
    }
}


function goHome() {

    document
        .getElementById("clubsSection")
        .classList.add("hidden");

    document
        .getElementById("eventsSection")
        .classList.add("hidden");

    document
        .getElementById("homeSection")
        .classList.remove("hidden");
}


// =============================
// الوضع الليلي
// =============================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );

    localStorage.setItem(
        "darkMode",
        document.body.classList.contains(
            "dark-mode"
        )
    );
}


// =============================
// إغلاق النوافذ
// =============================

function closeModals() {

    document
        .querySelectorAll(".modal")
        .forEach(
            modal =>
                modal.classList.add(
                    "hidden"
                )
        );

    selectedTheaterSeats = [];
}


// =============================
// Admin
// =============================

function openAdmin() {

    window.location.href =
        "admin.html";
}