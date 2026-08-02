# Admin Dashboard Hero Design

## System-health tiles
Hero section for admin dashboard showing system health at a glance.

## Tiles
- **API Status**: green/yellow/red with uptime %
- **Active Users**: count + 24h trend arrow
- **Queue Depth**: pending tasks with threshold warning
- **Error Rate**: % with sparkline
- **DB Health**: connection pool status

## Layout
- 5-column responsive grid
- Each tile: icon + metric + trend indicator
- Skeleton loading state
- Auto-refresh every 30s with subtle animation

Closes #489