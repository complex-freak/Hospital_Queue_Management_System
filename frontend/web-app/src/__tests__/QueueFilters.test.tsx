import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QueueFilters from '../components/dashboard/QueueFilters';

// Mock the Select component since it may not work in test environment
jest.mock('@/components/ui/select', () => {
  return {
    Select: ({ children, value, onValueChange }: any) => (
      <div data-testid="mock-select">
        <select 
          data-testid="mock-select-input" 
          value={value} 
          onChange={(e) => onValueChange(e.target.value)}
        >
          {React.Children.map(children, child => {
            if (child.type.name === 'SelectContent') {
              return child.props.children;
            }
            return null;
          })}
        </select>
        {children}
      </div>
    ),
    SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
    SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: any) => (
      <option data-testid="select-item" value={value}>
        {children}
      </option>
    ),
    SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  };
});

describe('QueueFilters Component', () => {
  test('renders search input', () => {
    const handleFilterChange = jest.fn();
    render(<QueueFilters onFilterChange={handleFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search patients...');
    expect(searchInput).toBeInTheDocument();
  });
  
  test('calls onFilterChange when search input changes', () => {
    const handleFilterChange = jest.fn();
    render(<QueueFilters onFilterChange={handleFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search patients...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(handleFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      search: 'John',
    }));
  });
  
  test('resets filters when reset button is clicked', () => {
    const handleFilterChange = jest.fn();
    render(<QueueFilters onFilterChange={handleFilterChange} />);
    
    // First change search to make reset button appear
    const searchInput = screen.getByPlaceholderText('Search patients...');
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    
    // Now find and click reset button
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    // Check if onFilterChange was called with default values
    expect(handleFilterChange).toHaveBeenLastCalledWith({
      search: '',
      sortField: 'checkInTime',
      sortDirection: 'asc',
      priorityFilter: 'All',
    });
  });
}); 