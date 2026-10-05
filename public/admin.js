const token =
    localStorage.getItem("token");

const API = "/api";


function showToast(message) {

    const toast =
        document.getElementById(
            "adminToast"
        );

    toast.textContent =
        message;

    toast.style.display =
        "block";

    setTimeout(() => {

        toast.style.display =
            "none";

    }, 3000);
}


async function api(
    url,
    options = {}
) {

    options.headers = {
        "Content-Type":
            "application/json",

        Authorization:
            `Bearer ${token}`,

        ...(options.headers || {})
    };

    const response =
        await fetch(
            API + url,
            options
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.message ||
            "حدث خطأ"
        );
    }

    return data;
}


async function checkAdmin() {

    try {

        const result =
            await api(
                "/profile"
            );

        if (
            result.user.role !==
            "admin"
        ) {

            alert(
                "هذه الصفحة للمشرف فقط"
            );

            location.href =
                "index.html";

            return;
        }

        loadDashboard();

    } catch (error) {

        alert(
            "يجب تسجيل الدخول كمشرف"
        );

        location.href =
            "index.html";
    }
}


async function loadDashboard() {

    try {

        const users =
            await api(
                "/admin/users"
            );

        const bookings =
            await api(
                "/admin/bookings"
            );

        const events =
            await api(
                "/events"
            );

        const clubs =
            await api(
                "/clubs"
            );

        document
            .getElementById(
                "usersCount"
            )
            .textContent =
            users.users.length;

        document
            .getElementById(
                "bookingsCount"
            )
            .textContent =
            bookings.bookings.length;

        document
            .getElementById(
                "eventsCount"
            )
            .textContent =
            events.events.length;

        document
            .getElementById(
                "clubsCount"
            )
            .textContent =
            clubs.clubs.length;

        renderUsers(
            users.users
        );

        renderBookings(
            bookings.bookings
        );

        renderClubs(
            clubs.clubs
        );

        renderEvents(
            events.events
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// الأندية
// =============================

function renderClubs(clubs) {

    const container =
        document.getElementById(
            "clubsTable"
        );

    container.innerHTML = `
        <table>

            <tr>
                <th>الاسم</th>
                <th>المشرفة</th>
                <th>الوصف</th>
                <th>الإجراء</th>
            </tr>

            ${clubs.map(
                club => `
                    <tr>

                        <td>
                            ${club.name}
                        </td>

                        <td>
                            ${club.supervisor}
                        </td>

                        <td>
                            ${club.description}
                        </td>

                        <td>

                            <button
                                class="delete-button"
                                onclick="deleteClub(${club.id})"
                            >
                                حذف
                            </button>

                        </td>

                    </tr>
                `
            ).join("")}

        </table>
    `;
}


async function addClub() {

    const name =
        document
            .getElementById(
                "clubName"
            )
            .value
            .trim();

    const supervisor =
        document
            .getElementById(
                "clubSupervisor"
            )
            .value
            .trim();

    const description =
        document
            .getElementById(
                "clubDescription"
            )
            .value
            .trim();

    if (!name) {

        showToast(
            "اكتبي اسم النادي"
        );

        return;
    }

    try {

        const result =
            await api(
                "/admin/clubs",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            name,
                            supervisor,
                            description
                        })
                }
            );

        showToast(
            result.message
        );

        document
            .getElementById(
                "clubName"
            )
            .value = "";

        document
            .getElementById(
                "clubSupervisor"
            )
            .value = "";

        document
            .getElementById(
                "clubDescription"
            )
            .value = "";

        loadDashboard();

    } catch (error) {

        showToast(
            error.message
        );
    }
}


async function deleteClub(id) {

    if (
        !confirm(
            "هل تريدين حذف هذا النادي؟"
        )
    ) {
        return;
    }

    try {

        await api(
            `/admin/clubs/${id}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "تم حذف النادي"
        );

        loadDashboard();

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// الفعاليات
// =============================

function renderEvents(events) {

    const container =
        document.getElementById(
            "eventsTable"
        );

    container.innerHTML = `
        <table>

            <tr>
                <th>الفعالية</th>
                <th>الكلية</th>
                <th>اليوم</th>
                <th>المكان</th>
                <th>النوع</th>
                <th>الإجراء</th>
            </tr>

            ${events.map(
                event => `
                    <tr>

                        <td>
                            ${event.title}
                        </td>

                        <td>
                            ${event.college}
                        </td>

                        <td>
                            ${event.day}
                        </td>

                        <td>
                            ${event.location}
                        </td>

                        <td>
                            ${
                                event.type === "seat"
                                ? "مقاعد"
                                : "وقت"
                            }
                        </td>

                        <td>

                            <button
                                class="delete-button"
                                onclick="deleteEvent(${event.id})"
                            >
                                حذف
                            </button>

                        </td>

                    </tr>
                `
            ).join("")}

        </table>
    `;
}


async function addEvent() {

    const data = {

        title:
            document
                .getElementById(
                    "eventTitle"
                )
                .value
                .trim(),

        college:
            document
                .getElementById(
                    "eventCollege"
                )
                .value
                .trim(),

        day:
            document
                .getElementById(
                    "eventDay"
                )
                .value,

        duration:
            document
                .getElementById(
                    "eventDuration"
                )
                .value
                .trim(),

        location:
            document
                .getElementById(
                    "eventLocation"
                )
                .value
                .trim(),

        capacity:
            document
                .getElementById(
                    "eventCapacity"
                )
                .value,

        type:
            document
                .getElementById(
                    "eventType"
                )
                .value,

        description:
            document
                .getElementById(
                    "eventDescription"
                )
                .value
                .trim()
    };

    if (
        !data.title ||
        !data.college
    ) {

        showToast(
            "أدخلي اسم الفعالية والكلية"
        );

        return;
    }

    try {

        const result =
            await api(
                "/admin/events",
                {
                    method: "POST",

                    body:
                        JSON.stringify(data)
                }
            );

        showToast(
            result.message
        );

        loadDashboard();

    } catch (error) {

        showToast(
            error.message
        );
    }
}


async function deleteEvent(id) {

    if (
        !confirm(
            "هل تريدين حذف هذه الفعالية؟"
        )
    ) {
        return;
    }

    try {

        await api(
            `/admin/events/${id}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "تم حذف الفعالية"
        );

        loadDashboard();

    } catch (error) {

        showToast(
            error.message
        );
    }
}


// =============================
// المستخدمون
// =============================

function renderUsers(users) {

    const container =
        document.getElementById(
            "usersTable"
        );

    container.innerHTML = `
        <table>

            <tr>
                <th>الاسم</th>
                <th>الرقم الجامعي</th>
                <th>البريد</th>
                <th>التخصص</th>
                <th>النقاط</th>
                <th>النجوم</th>
            </tr>

            ${users.map(
                user => `
                    <tr>

                        <td>
                            ${user.name}
                        </td>

                        <td>
                            ${user.student_id}
                        </td>

                        <td>
                            ${user.email}
                        </td>

                        <td>
                            ${user.major}
                        </td>

                        <td>
                            ${user.points}
                        </td>

                        <td>
                            ⭐ ${user.stars}
                        </td>

                    </tr>
                `
            ).join("")}

        </table>
    `;
}


// =============================
// الحجوزات
// =============================

function renderBookings(
    bookings
) {

    const container =
        document.getElementById(
            "bookingsTable"
        );

    container.innerHTML = `
        <table>

            <tr>
                <th>المستخدم</th>
                <th>البريد</th>
                <th>الفعالية</th>
                <th>النوع</th>
                <th>المقعد</th>
                <th>الوقت</th>
                <th>الحالة</th>
            </tr>

            ${bookings.map(
                booking => `
                    <tr>

                        <td>
                            ${booking.name}
                        </td>

                        <td>
                            ${booking.email}
                        </td>

                        <td>
                            ${booking.title}
                        </td>

                        <td>
                            ${
                                booking.booking_type
                            }
                        </td>

                        <td>
                            ${
                                booking.seat_number
                                || "-"
                            }
                        </td>

                        <td>
                            ${
                                booking.time_slot
                                || "-"
                            }
                        </td>

                        <td>
                            ${
                                booking.status
                            }
                        </td>

                    </tr>
                `
            ).join("")}

        </table>
    `;
}


// =============================
// خروج Admin
// =============================

function adminLogout() {

    localStorage.removeItem(
        "token"
    );

    location.href =
        "index.html";
}


checkAdmin();