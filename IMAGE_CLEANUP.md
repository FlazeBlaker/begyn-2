# Image Auto-Deletion Feature

## Overview
Images stored in Firebase Storage are automatically deleted after 30 days to save storage costs and manage data retention.

## How It Works

### 1. Scheduled Cleanup Function
- **Function Name**: `cleanupOldImages`
- **Schedule**: Runs every 24 hours
- **Location**: `functions/index.js`

### 2. Deletion Criteria
The function deletes images that meet ALL of the following conditions:
- Located in `users/{userId}/generated_images/` folder
- Created more than 30 days ago
- File type: PNG images

### 3. User Warning
Users see a warning message in the History page:
> ⚠️ Images will be deleted after 30 days. Make sure to download them.

## Deployment

### Deploy the Cleanup Function
```bash
firebase deploy --only functions:cleanupOldImages
```

### Deploy All Functions
```bash
firebase deploy --only functions
```

## Manual Testing

To manually trigger the cleanup function (for testing):
```bash
firebase functions:shell
> cleanupOldImages()
```

## Monitoring

View cleanup logs in Firebase Console:
1. Go to Firebase Console → Functions
2. Select `cleanupOldImages`
3. View logs to see deletion activity

## Cost Savings

Automatic deletion helps:
- Reduce Firebase Storage costs
- Stay within free tier limits (5GB)
- Maintain optimal performance

## User Impact

Users should:
- Download important images within 30 days
- Use the "Download Image" button in History page
- Be aware of the 30-day retention policy

## Technical Details

- **Execution Time**: Runs daily at midnight UTC
- **Batch Processing**: Deletes all eligible images in one run
- **Error Handling**: Logs errors but continues processing remaining files
- **Performance**: Uses Promise.all() for parallel deletion
