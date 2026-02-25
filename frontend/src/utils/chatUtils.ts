/**
 * Chat Utility Functions
 * 
 * Utility functions for chat system including role-based filtering and labeling.
 * Requirements: 3.1-3.4 (Role-Based Chat Interface)
 */

import { UserRole } from '@/types/auth.types';

/**
 * Get the appropriate role tabs for a user based on their role
 * 
 * Requirements:
 * - Player: Players, Organizers, Venue Owners (3.1)
 * - Organizer: Players, Organizers, Venue Owners, Referees (3.2)
 * - Venue Owner: Players, Organizers, Venue Owners (3.3)
 * - Referee: No tabs (single list) (3.4)
 * - Admin: All roles
 * 
 * @param userRole - The role of the current user
 * @returns Array of UserRole values representing available tabs
 */
export function getRoleTabsForUser(userRole: UserRole): UserRole[] {
  const tabMap: Record<UserRole, UserRole[]> = {
    [UserRole.PLAYER]: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.VENUE_OWNER],
    [UserRole.ORGANIZER]: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.VENUE_OWNER, UserRole.REFEREE],
    [UserRole.VENUE_OWNER]: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.VENUE_OWNER],
    [UserRole.REFEREE]: [], // No tabs for referees - single unfiltered list
    // Admin can see all roles (though not explicitly in requirements, following design pattern)
  };

  return tabMap[userRole] || [];
}

/**
 * Get the display label for a user role
 * 
 * @param role - The UserRole to get a label for
 * @returns Human-readable label for the role
 */
export function getRoleLabel(role: UserRole): string {
  const labelMap: Record<UserRole, string> = {
    [UserRole.PLAYER]: 'Players',
    [UserRole.ORGANIZER]: 'Organizers',
    [UserRole.VENUE_OWNER]: 'Venue Owners',
    [UserRole.REFEREE]: 'Referees',
  };

  return labelMap[role] || role;
}
