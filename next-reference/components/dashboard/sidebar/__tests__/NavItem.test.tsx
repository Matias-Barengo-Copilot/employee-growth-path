import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavItem } from '../NavItem';
import { FileText } from 'lucide-react';

describe('NavItem', () => {
  it('should render with correct props', () => {
    render(
      <NavItem
        label="Test Item"
        href="/test"
        icon={FileText}
        isActive={false}
        isCollapsed={false}
      />
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/test');
  });

  it('should apply active state styling when isActive is true', () => {
    const { container } = render(
      <NavItem
        label="Active Item"
        href="/active"
        icon={FileText}
        isActive={true}
        isCollapsed={false}
      />
    );

    const link = container.querySelector('a');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('should show only icon when collapsed', () => {
    const { container } = render(
      <NavItem
        label="Collapsed Item"
        href="/collapsed"
        icon={FileText}
        isActive={false}
        isCollapsed={true}
      />
    );

    expect(screen.queryByText('Collapsed Item')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should display badge when provided', () => {
    render(
      <NavItem
        label="Item with Badge"
        href="/badge"
        icon={FileText}
        isActive={false}
        isCollapsed={false}
        badge={5}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

