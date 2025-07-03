import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { X, Search, Filter, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';
export type SortField = 'name' | 'checkInTime' | 'priority';
export type PriorityFilter = 'All' | 'High' | 'Medium' | 'Low';

export interface QueueFiltersState {
  search: string;
  sortField: SortField;
  sortDirection: SortDirection;
  priorityFilter: PriorityFilter;
}

interface QueueFiltersProps {
  onFilterChange: (filters: QueueFiltersState) => void;
}

const QueueFilters: React.FC<QueueFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<QueueFiltersState>({
    search: '',
    sortField: 'checkInTime',
    sortDirection: 'asc',
    priorityFilter: 'All',
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...filters, search: e.target.value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortFieldChange = (value: SortField) => {
    const newFilters = { ...filters, sortField: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortDirectionToggle = () => {
    const newDirection: SortDirection = filters.sortDirection === 'asc' ? 'desc' : 'asc';
    const newFilters = { ...filters, sortDirection: newDirection };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePriorityFilterChange = (value: PriorityFilter) => {
    const newFilters = { ...filters, priorityFilter: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearSearch = () => {
    const newFilters = { ...filters, search: '' };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters = {
      search: '',
      sortField: 'checkInTime' as SortField,
      sortDirection: 'asc' as SortDirection,
      priorityFilter: 'All' as PriorityFilter,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-grow">
          <Input
            placeholder="Search patients..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-9 pr-9"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={filters.priorityFilter}
            onValueChange={handlePriorityFilterChange}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <Select
            value={filters.sortField}
            onValueChange={handleSortFieldChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkInTime">Wait time</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleSortDirectionToggle}
            className="h-9 w-9"
            title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filters.sortDirection === 'asc' ? '↑' : '↓'}
          </Button>
        </div>

        {(filters.search || filters.sortField !== 'checkInTime' || 
         filters.sortDirection !== 'asc' || filters.priorityFilter !== 'All') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={resetFilters}
            className="ml-auto"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};

export default QueueFilters; 