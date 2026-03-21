# CEO Role Management System - Implementation Guide

## Overview
The system has been redesigned to give all user management powers to the CEO role only. Here's what was implemented:

## CEO Credentials (Hardcoded)
- **Username**: `ceo@gharpayy`
- **Email**: `ceo@gharpayy`
- **Password**: `12345678`

**Note**: Store these credentials securely. They are created automatically when the app starts.

---

## System Architecture

### Role Hierarchy
```
CEO (Full Control)
├── Managers (Can be created by CEO only)
│   ├── Assigned Admins (Multiple)
│   └── Can view agents under their admins
├── Admins (Can be created by CEO only)
│   ├── Assigned Zones (Multiple)
│   ├── Assigned Agents (Multiple)
│   └── Parent Manager (Optional)
└── Agents (Can be created by CEO only)
    ├── Assigned Zones (Multiple)
    ├── Parent Admin (Optional)
    └── Can manage leads/properties in assigned zones
```

---

## User Model Changes

The User model has been updated from:
- Old: `zoneName` (single zone per user)
- New: `zones` (array of zones per user)

**New User Fields**:
- `role`: 'ceo' | 'manager' | 'admin' | 'agent' | 'user'
- `zones`: Array of zone names
- `managerIds`: Array of admin IDs managed by a manager
- `adminIds`: Array of agent IDs managed by an admin
- `managerId`: Parent manager (for admins)
- `adminId`: Parent admin (for agents)

---

## CEO Dashboard - Settings Page

When logged in as CEO, you'll see a comprehensive control panel in Settings with three tabs:

### 1. **Managers Tab**
Create and manage managers who will oversee zone admins.

**Add Manager Form**:
- Full Name *
- Email *
- Phone *
- Username *
- Password * (Initial password)
- Select Admins (Multiple selection)

**Manager List Shows**:
- Manager details (name, email, phone, username)
- Assigned admins with their zones
- Password reset button (CEO only)
- Delete button (CEO only)

### 2. **Admins Tab**
Create and manage zone admins for specific zones.

**Add Admin Form**:
- Full Name *
- Email *
- Phone *
- Username *
- Password * (Initial password)
- Select Zones (Multiple checkboxes: Zone1-Zone5)

**Admin List Shows**:
- Admin details (name, email, phone, username)
- Assigned zones
- Assigned agents under this admin
- Password reset button (CEO only)
- Delete button (CEO only)

### 3. **Agents Tab**
Create and manage agents/team members for specific zones.

**Add Agent Form**:
- Full Name *
- Email *
- Phone *
- Username *
- Password * (Initial password)
- Assign Admin (Optional - dropdown selection)
- Select Zones (Multiple checkboxes: Zone1-Zone5)

**Agent List Shows**:
- Agent details (name, email, phone, username)
- Assigned zones
- Parent admin (if assigned)
- Password reset button (CEO only)
- Delete button (CEO only)

---

## API Endpoints

### Managers
- `GET /api/managers` - Get all managers (CEO only)
- `POST /api/managers` - Create manager (CEO only)
- `GET /api/managers/:id` - Get manager details (CEO only)
- `PUT /api/managers/:id` - Update manager (CEO only)
- `DELETE /api/managers/:id` - Delete manager (CEO only)

### Admins
- `GET /api/admins` - Get all admins (CEO only)
- `POST /api/admins` - Create admin (CEO only)
- `GET /api/admins/:id` - Get admin details (CEO only)
- `PUT /api/admins/:id` - Update admin (CEO only)
- `PATCH /api/admins/:id` - Reset admin password (CEO only)
- `DELETE /api/admins/:id` - Delete admin (CEO only)

### Agents
- `GET /api/agents` - Get agents (CEO sees all, admins see their own)
- `POST /api/agents` - Create agent (CEO only)
- `GET /api/agents/:id` - Get agent details (CEO or parent admin)
- `PUT /api/agents/:id` - Update agent (CEO only)
- `PATCH /api/agents/:id` - Reset agent password (CEO only)
- `DELETE /api/agents/:id` - Delete agent (CEO only)

---

## Key Features

✅ **CEO-Only User Management**: Only CEO can add, edit, or delete managers, admins, and agents

✅ **Multiple Zone Assignment**: Admins and agents can be assigned to multiple zones

✅ **Hierarchical Structure**: 
- Managers oversee admins
- Admins oversee agents
- CEO oversees everything

✅ **Password Management**: CEO can reset passwords for any user

✅ **User Deletion**: CEO can delete any user (removes them from all manager/admin assignments)

✅ **Automatic CEO Creation**: CEO user is created automatically on first app startup

✅ **Nested Data Display**: View complete hierarchy:
  - Managers with their admins
  - Admins with their agents
  - All in one expandable view

---

## Old System - Removed Features

❌ Managers can no longer add admins (CEO only now)
❌ Admins can no longer add agents (CEO only now)
❌ Single zone assignment (now supports multiple zones)

---

## Migration Notes

If you have existing data:
1. **Old Agent Collection**: The legacy `Agent` collection is still supported for backward compatibility in GET requests
2. **New User Model**: All new agents/admins/managers are created as User documents
3. The system gracefully handles both old and new data models

---

## Testing Checklist

- [ ] Log in with CEO credentials (ceo@gharpayy / 12345678)
- [ ] Create a new admin with multiple zones assigned
- [ ] Create a new manager with admins assigned
- [ ] Create a new agent with zones and admin assigned
- [ ] View the hierarchy in the settings panel
- [ ] Reset password for any user
- [ ] Delete a user and verify relationships are cleaned up
- [ ] Log in as created admin/agent to verify access

---

## Troubleshooting

**Issue**: CEO user not created
**Solution**: Ensure database is connected and `ensureDefaultCEO()` is called on app startup. Check login route initialization.

**Issue**: Can't create managers/admins/agents
**Solution**: Verify you're logged in as CEO role. Check API response for detailed error messages.

**Issue**: Old admin/agent data not showing
**Solution**: The new system displays new User model data. Legacy Agent collection data is still accessible in GET endpoints for backward compatibility.

---

## Next Steps

1. ✅ Database schema updated
2. ✅ API endpoints updated
3. ✅ CEO settings UI created
4. ⏭️ Test the full flow with CEO login
5. ⏭️ Optionally migrate existing data to new User model

