import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActivityFeed from './ActivityFeed';
import { BrowserRouter } from 'react-router-dom';

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const advanceAndWait = async () => {
    // Advance past the 500ms loading delay
    vi.advanceTimersByTime(600);
    // Let React settle
    await Promise.resolve();
  };

  it('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <ActivityFeed />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading activity feed…')).toBeInTheDocument();
    expect(screen.getByText('Loading activity feed…')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders feed items and empty states correctly', async () => {
    render(
      <BrowserRouter>
        <ActivityFeed />
      </BrowserRouter>
    );

    await advanceAndWait();

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
    });

    // It should render ActivityItems
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);

    // It should render the Empty Day Divider
    expect(screen.getByText(/days with no activity/)).toBeInTheDocument();

    // It should render the Quiet Week Summary Card
    expect(screen.getByText("It's been a quiet week")).toBeInTheDocument();
    expect(screen.getByText("Manage Notification Settings")).toBeInTheDocument();
  });

  describe('Unread indicators', () => {
    it('renders the unread count badge when there are unread activities', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // First 5 mock items are unread, so badge should show "5"
      const badge = screen.getByRole('status', { name: /unread/ });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('renders the mark-all-read button when there are unread items', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // The mark all read button should be present when there are unread items
      const markAllBtn = screen.getByRole('button', { name: /mark all/i });
      expect(markAllBtn).toBeInTheDocument();
    });

    it('renders unread dot on unread activity items', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // Find unread articles
      const unreadArticles = document.querySelectorAll('.activity-item.unread');
      expect(unreadArticles.length).toBeGreaterThan(0);
    });

    it('applies aria-current="true" on unread items', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const currentItems = document.querySelectorAll('[aria-current="true"]');
      expect(currentItems.length).toBeGreaterThan(0);
    });
  });

  describe('Mark all read', () => {
    it('marks all activities as read when clicking mark all read', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // Click "Mark all read"
      const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
      fireEvent.click(markAllBtn);

      // After marking all read, unread dot should disappear
      const unreadDots = document.querySelectorAll('.unread-dot');
      expect(unreadDots.length).toBe(0);

      // Unread count badge should be gone
      expect(screen.queryByRole('status', { name: /unread/ })).not.toBeInTheDocument();
    });

    it('shows undo banner after marking all read', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
      fireEvent.click(markAllBtn);

      // Undo banner should appear
      expect(screen.getByText('All activities marked as read.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Undo button should be present
      const undoBtn = screen.getByRole('button', { name: 'Undo' });
      expect(undoBtn).toBeInTheDocument();
    });

    it('restores unread state when undo is clicked', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
      fireEvent.click(markAllBtn);

      // Click undo
      const undoBtn = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(undoBtn);

      // Undo banner should disappear
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Unread dots should be restored
      const unreadDots = document.querySelectorAll('.unread-dot');
      expect(unreadDots.length).toBeGreaterThan(0);
    });

    it('dismisses the undo banner when dismiss is clicked', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
      fireEvent.click(markAllBtn);

      // Click dismiss
      const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
      fireEvent.click(dismissBtn);

      // Undo banner should disappear
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('auto-dismisses the undo banner after timeout', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
      fireEvent.click(markAllBtn);

      // Banner should be visible
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fast-forward almost 10 seconds
      vi.advanceTimersByTime(10000);

      // Banner should auto-dismiss
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Individual mark read', () => {
    it('renders mark-read buttons on unread items', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // Find mark-read buttons
      const markReadBtns = screen.getAllByRole('button', { name: /mark.*read/i });
      expect(markReadBtns.length).toBeGreaterThan(0);
    });

    it('marks a single item as read when clicked', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // Count unread items initially
      const initialUnread = document.querySelectorAll('.unread-dot').length;

      // Click the first mark-read button
      const markReadBtns = screen.getAllByRole('button', { name: /mark.*read/i });
      fireEvent.click(markReadBtns[0]);

      // One fewer unread dot
      const afterUnread = document.querySelectorAll('.unread-dot').length;
      expect(afterUnread).toBe(initialUnread - 1);
    });
  });

  describe('Accessibility', () => {
    it('has a polite live region for announcements', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // The live region should be present
      const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('announces when mark all read is triggered', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
      fireEvent.click(markAllBtn);

      // The visible alert is the undo banner with role="alert"
      expect(screen.getByRole('alert')).toHaveTextContent('All activities marked as read.');
    });

    it('has accessible unread badges with proper aria-label', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      // The unread count badge should have an accessible label
      const badge = screen.getByRole('status', { name: /unread/ });
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('unread'));
    });

    it('renders unread items with aria-current="true"', async () => {
      render(
        <BrowserRouter>
          <ActivityFeed />
        </BrowserRouter>
      );

      await advanceAndWait();

      await waitFor(() => {
        expect(screen.queryByText('Loading activity feed…')).not.toBeInTheDocument();
      });

      const unreadArticles = document.querySelectorAll('[aria-current="true"]');
      expect(unreadArticles.length).toBeGreaterThan(0);
    });
  });
});
