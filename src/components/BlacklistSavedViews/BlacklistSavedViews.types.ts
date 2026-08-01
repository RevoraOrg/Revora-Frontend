/**
 * BlacklistSavedViews — Issue #431
 *
 * Saved-views dropdown for the blacklist filter chip bar. Supports the
 * actions specified in `docs/blacklist-filters-saved-views.md`:
 *   apply, rename, set default, share (URL), delete, and save current.
 */

import type { BlacklistFilterSelection } from '../BlacklistFilterChips/BlacklistFilterChips.types';

export interface BlacklistSavedView {
  id: string;
  name: string;
  /** The chip selection captured when the view was saved. */
  filters: BlacklistFilterSelection;
  /** When true, this view is the user's default landing view. */
  isDefault?: boolean;
  createdAt: string;
}

export interface BlacklistSavedViewsProps {
  /** All saved views for the current user. */
  views: BlacklistSavedView[];
  /** Id of the view that produced the currently applied filters. */
  activeViewId: string | null;
  /** The current live filter selection (used to save new views). */
  currentFilters: BlacklistFilterSelection;
  /** Whether the current filter selection contains any active chips. */
  hasActiveFilters?: boolean;
  /** Renders the "couldn't load saved views" error state. */
  hasError?: boolean;
  onApplyView: (view: BlacklistSavedView) => void;
  onSaveView: (name: string, filters: BlacklistFilterSelection) => void;
  onRenameView: (id: string, name: string) => void;
  onDeleteView: (id: string) => void;
  onSetDefaultView: (id: string) => void;
  onShareView: (view: BlacklistSavedView) => void;
}
