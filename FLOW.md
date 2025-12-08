# Plot Booking Application - Flow Documentation

## Overview

This application allows admins to upload real estate layout images, draw clickable plot areas on them, and manage bookings. Public users can view layouts and check plot availability without logging in.

---

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Express API   │────▶│   SQLite DB     │
│   (Flutter/Web) │◀────│   (Node.js)     │◀────│   (database.sqlite)
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   File Storage  │
                        │   (uploads/)    │
                        └─────────────────┘
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Login, upload layouts, draw plots, manage bookings, update status |
| **Public** | View layouts, view plot details, search plots (no login required) |

---

## Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Admin   │         │   API    │         │    DB    │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  POST /auth/login  │                    │
     │  {email, password} │                    │
     │───────────────────▶│                    │
     │                    │  Find user by email│
     │                    │───────────────────▶│
     │                    │◀───────────────────│
     │                    │                    │
     │                    │  Compare password  │
     │                    │  (bcrypt)          │
     │                    │                    │
     │  {token, user}     │                    │
     │◀───────────────────│                    │
     │                    │                    │
     │  All future requests include:           │
     │  Authorization: Bearer <token>          │
     │                    │                    │
```

---

## Admin Workflow

### Step 1: Create Admin Account (First Time Only)

```
POST /api/auth/create-admin
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "securepassword",
  "phone": "9876543210"
}
```

### Step 2: Login

```
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "securepassword"
}

Response: { token: "eyJhbG..." }
```

### Step 3: Upload Layout Image

```
POST /api/layouts
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  - image: <layout.png>
  - name: "Green Valley Phase 1"
  - location: "Bangalore"
  - description: "Premium residential plots"
```

The server:
1. Saves image to `uploads/` folder
2. Extracts image dimensions using `sharp`
3. Creates layout record in database

### Step 4: Draw Plots on Layout

Admin draws rectangular areas on the layout image. Each plot has coordinates (x, y, width, height).

```
POST /api/plots
Authorization: Bearer <token>
{
  "layoutId": "uuid-of-layout",
  "plotNumber": "101",
  "x": 120,
  "y": 80,
  "width": 40,
  "height": 40,
  "price": 500000,
  "size": "30x40",
  "facing": "East",
  "description": "Corner plot"
}
```

Or create multiple plots at once:

```
POST /api/plots/batch
Authorization: Bearer <token>
{
  "layoutId": "uuid-of-layout",
  "plots": [
    {"plotNumber": "101", "x": 120, "y": 80, "width": 40, "height": 40, "price": 500000},
    {"plotNumber": "102", "x": 160, "y": 80, "width": 40, "height": 40, "price": 450000},
    {"plotNumber": "103", "x": 200, "y": 80, "width": 40, "height": 40, "price": 480000}
  ]
}
```

### Step 5: Book a Plot for Client

```
POST /api/bookings
Authorization: Bearer <token>
{
  "plotId": "uuid-of-plot",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "clientPhone": "9876543210",
  "clientAddress": "123 Main Street",
  "paymentStatus": "partial",
  "amountPaid": 100000,
  "notes": "Customer requested east facing"
}
```

This automatically:
1. Creates booking record with client details
2. Updates plot status to `booked`

---

## Public User Flow

### View All Layouts (No Login Required)

```
GET /api/layouts

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Green Valley Phase 1",
      "location": "Bangalore",
      "imageUrl": "/uploads/abc123.png",
      "imageWidth": 1920,
      "imageHeight": 1080,
      "totalPlots": 50,
      "availablePlots": 35,
      "bookedPlots": 12,
      "holdPlots": 3
    }
  ]
}
```

### View Layout with All Plots

```
GET /api/layouts/:layoutId

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Green Valley Phase 1",
    "imageUrl": "/uploads/abc123.png",
    "imageWidth": 1920,
    "imageHeight": 1080,
    "plots": [
      {
        "id": "plot-uuid",
        "plotNumber": "101",
        "x": 120,
        "y": 80,
        "width": 40,
        "height": 40,
        "status": "available",
        "price": 500000,
        "size": "30x40",
        "facing": "East"
      }
    ]
  }
}
```

### Search Plots

```
GET /api/plots/search?layoutId=uuid&query=101
```

### Get Plot Details

```
GET /api/plots/:plotId
```

---

## Plot Status Flow

```
                    ┌─────────────┐
                    │  AVAILABLE  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               │
    ┌─────────────┐ ┌─────────────┐        │
    │    HOLD     │ │   BOOKED    │        │
    └──────┬──────┘ └──────┬──────┘        │
           │               │               │
           │  Cancel       │  Cancel       │
           └───────────────┴───────────────┘
```

| Status | Color (UI) | Description |
|--------|------------|-------------|
| `available` | 🟢 Green | Plot is available for booking |
| `hold` | 🟡 Yellow | Temporarily reserved |
| `booked` | 🔴 Red | Plot is sold/booked |

---

## Backend-Rendered Maps (Like Google Maps)

The backend can generate **complete interactive maps** that frontends simply embed. No coordinate calculations needed on frontend!

### Option 1: Embed as SVG Image
```html
<!-- Direct image embed -->
<img src="http://localhost:3000/api/map/{layoutId}/svg" alt="Layout Map" />

<!-- Or as object for interactivity -->
<object data="http://localhost:3000/api/map/{layoutId}/svg" type="image/svg+xml"></object>
```

Query parameters:
- `showLabels=true|false` - Show plot numbers
- `showLegend=true|false` - Show color legend
- `opacity=0.6` - Plot overlay opacity

### Option 2: Embed as iFrame (Full Interactive)
```html
<iframe
  src="http://localhost:3000/api/map/{layoutId}/html"
  width="100%"
  height="600px"
  frameborder="0">
</iframe>
```

Features included:
- ✅ Zoom in/out controls
- ✅ Click to see plot details (tooltip)
- ✅ Legend with color codes
- ✅ Responsive design
- ✅ Parent window communication (postMessage)

### Option 3: Get Map Data JSON (Custom Rendering)
```javascript
const response = await fetch('/api/map/{layoutId}/data');
const { data } = await response.json();

// Returns:
{
  layout: { id, name, imageUrl, width, height },
  plots: [
    {
      id, plotNumber, status,
      coordinates: { x, y, width, height },
      percentages: { left: '10%', top: '5%', width: '5%', height: '5%' },
      price, size, facing
    }
  ],
  stats: { total: 50, available: 35, booked: 12, hold: 3 },
  statusColors: { available: {...}, booked: {...}, hold: {...} }
}
```

### Listening to Plot Clicks from iFrame
```javascript
// In parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'plotClick') {
    console.log('Plot clicked:', event.data.plot);
    // Show modal, navigate, etc.
  }
});
```

---

## Frontend Integration (Manual Rendering)

### 1. Fetch Layout Data
```javascript
const response = await fetch('/api/layouts/uuid');
const { data } = await response.json();
```

### 2. Display Image with Clickable Plots
```jsx
// React Example
<div style={{ position: 'relative' }}>
  <img src={data.imageUrl} alt={data.name} />

  {data.plots.map(plot => (
    <div
      key={plot.id}
      onClick={() => showPlotDetails(plot)}
      style={{
        position: 'absolute',
        left: plot.x,
        top: plot.y,
        width: plot.width,
        height: plot.height,
        backgroundColor: getStatusColor(plot.status),
        opacity: 0.5,
        cursor: 'pointer'
      }}
    />
  ))}
</div>
```

### 3. Flutter Example
```dart
Stack(
  children: [
    Image.network(layout.imageUrl),
    ...layout.plots.map((plot) => Positioned(
      left: plot.x,
      top: plot.y,
      child: GestureDetector(
        onTap: () => showPlotInfo(plot),
        child: Container(
          width: plot.width,
          height: plot.height,
          color: getStatusColor(plot.status).withOpacity(0.4),
        ),
      ),
    )).toList(),
  ],
)
```

---

## Data Models

### User
```
┌────────────────────────────────┐
│            User                │
├────────────────────────────────┤
│ id: UUID (PK)                  │
│ name: String                   │
│ email: String (unique)         │
│ phone: String                  │
│ password: String (hashed)      │
│ role: enum (admin, user)       │
│ isActive: Boolean              │
│ createdAt: DateTime            │
│ updatedAt: DateTime            │
└────────────────────────────────┘
```

### Layout
```
┌────────────────────────────────┐
│           Layout               │
├────────────────────────────────┤
│ id: UUID (PK)                  │
│ name: String                   │
│ location: String               │
│ description: Text              │
│ imageUrl: String               │
│ imageWidth: Integer            │
│ imageHeight: Integer           │
│ isActive: Boolean              │
│ createdAt: DateTime            │
│ updatedAt: DateTime            │
└────────────────────────────────┘
         │
         │ 1:N
         ▼
┌────────────────────────────────┐
│            Plot                │
├────────────────────────────────┤
│ id: UUID (PK)                  │
│ layoutId: UUID (FK)            │
│ plotNumber: String             │
│ x: Float                       │
│ y: Float                       │
│ width: Float                   │
│ height: Float                  │
│ polygonCoordinates: JSON       │
│ status: enum (available,       │
│         booked, hold)          │
│ price: Decimal                 │
│ size: String                   │
│ facing: String                 │
│ description: Text              │
│ createdAt: DateTime            │
│ updatedAt: DateTime            │
└────────────────────────────────┘
         │
         │ 1:N
         ▼
┌────────────────────────────────┐
│          Booking               │
├────────────────────────────────┤
│ id: UUID (PK)                  │
│ plotId: UUID (FK)              │
│ clientName: String             │
│ clientEmail: String            │
│ clientPhone: String            │
│ clientAddress: Text            │
│ bookingDate: DateTime          │
│ status: enum (pending,         │
│         confirmed, cancelled)  │
│ paymentStatus: enum (pending,  │
│         partial, completed)    │
│ amountPaid: Decimal            │
│ notes: Text                    │
│ createdBy: UUID (FK → User)    │
│ createdAt: DateTime            │
│ updatedAt: DateTime            │
└────────────────────────────────┘
```

---

## API Endpoints Summary

### Public Endpoints (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/layouts` | List all layouts with stats |
| GET | `/api/layouts/:id` | Get layout with all plots |
| GET | `/api/plots/search` | Search plots |
| GET | `/api/plots/:id` | Get plot details |
| GET | `/api/map/:id/svg` | **Get complete SVG map (embed as image)** |
| GET | `/api/map/:id/html` | **Get interactive HTML map (embed in iframe)** |
| GET | `/api/map/:id/data` | **Get map data JSON (custom rendering)** |
| GET | `/api/health` | Health check |

### Admin Endpoints (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/profile` | Get profile |
| POST | `/api/layouts` | Create layout (upload image) |
| PUT | `/api/layouts/:id` | Update layout |
| DELETE | `/api/layouts/:id` | Delete layout |
| POST | `/api/plots` | Create plot |
| POST | `/api/plots/batch` | Create multiple plots |
| PUT | `/api/plots/:id` | Update plot |
| PATCH | `/api/plots/:id/status` | Update plot status |
| DELETE | `/api/plots/:id` | Delete plot |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/:id` | Get booking details |
| PUT | `/api/bookings/:id` | Update booking |
| PATCH | `/api/bookings/:id/cancel` | Cancel booking |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start

# 3. Create admin
curl -X POST http://localhost:3000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"admin123"}'

# 4. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 5. Use the returned token for all admin operations
```

---

## File Structure

```
plot_booking/
├── src/
│   ├── config/
│   │   ├── database.js     # SQLite connection
│   │   └── multer.js       # File upload config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── layoutController.js
│   │   ├── plotController.js
│   │   └── bookingController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Layout.js
│   │   ├── Plot.js
│   │   ├── Booking.js
│   │   └── index.js        # Associations
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── layoutRoutes.js
│   │   ├── plotRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── index.js
│   └── server.js           # Entry point
├── uploads/                # Layout images
├── postman/                # Postman collection
├── database.sqlite         # SQLite database
├── .env                    # Environment config
└── package.json
```
```

