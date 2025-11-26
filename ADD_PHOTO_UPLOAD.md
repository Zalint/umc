# Add Photo Upload Feature

## Step 1: Update Database

Run this command in your terminal (PowerShell):

```powershell
# Add the attachments table
Get-Content db\add_attachments.sql | & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U zalint -d gambia_election
```

Or use your PostgreSQL client (pgAdmin, DBeaver, etc.) and run the SQL in `db/add_attachments.sql`

## Step 2: Restart Server

Stop the current server (if running) and restart:

```powershell
npm start
```

## Step 3: Test Photo Upload

1. Login as admin or member
2. Go to "Submit Results"
3. Select a station
4. Click "Load Station"
5. Scroll down to "Procès Verbal Photo" section
6. Click "Choose File" and select a photo
7. Click "Upload Photo"

## File Naming Convention

Photos are automatically named: `region_constituency_station_timestamp.jpg`

Example: `Banjul_Banjul_Central_22nd_July_Square_1732552800000.jpg`

## Features

✅ Upload photos from camera or gallery (mobile-friendly)
✅ Accepts: JPG, PNG, PDF files
✅ Max file size: 10MB
✅ Multiple uploads allowed per station
✅ Only most recent photo is displayed
✅ Click photo to view full size
✅ Photos stored in: `uploads/documents/`
✅ Access control: Members can only upload for their assigned stations

## Photo Display

- **On Submit Results page**: Shows most recent photo
- **Click photo**: Opens full size in new tab
- **Upload history**: All photos saved, most recent displayed

## Security

- ✅ Role-based upload permissions
- ✅ File type validation
- ✅ File size limits
- ✅ Members restricted to assigned stations
- ✅ Admin can delete any photo
- ✅ Users can only delete their own uploads

