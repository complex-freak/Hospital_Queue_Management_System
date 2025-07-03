import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RichTextEditor from '../components/dashboard/RichTextEditor';

// Mock react-quill since it doesn't work well in test environment
jest.mock('react-quill', () => {
  return function DummyQuill({ value, onChange, placeholder }: any) {
    return (
      <div data-testid="mock-quill">
        <textarea
          data-testid="mock-quill-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };
});

describe('RichTextEditor Component', () => {
  test('renders with initial value', () => {
    const initialValue = '<p>Test content</p>';
    const handleChange = jest.fn();
    
    render(
      <RichTextEditor
        initialValue={initialValue}
        onChange={handleChange}
        placeholder="Test placeholder"
      />
    );
    
    const editor = screen.getByTestId('mock-quill-editor');
    expect(editor).toHaveValue(initialValue);
  });
  
  test('calls onChange when content changes', () => {
    const initialValue = '<p>Initial content</p>';
    const handleChange = jest.fn();
    
    render(
      <RichTextEditor
        initialValue={initialValue}
        onChange={handleChange}
        placeholder="Test placeholder"
      />
    );
    
    const editor = screen.getByTestId('mock-quill-editor');
    fireEvent.change(editor, { target: { value: '<p>New content</p>' } });
    
    expect(handleChange).toHaveBeenCalledWith('<p>New content</p>');
  });
  
  test('shows autosave status when enabled', async () => {
    const mockAutosave = jest.fn().mockResolvedValue(undefined);
    
    render(
      <RichTextEditor
        initialValue="<p>Test</p>"
        onChange={() => {}}
        autosave={true}
        autosaveInterval={100} // Short for testing
        onAutosave={mockAutosave}
      />
    );
    
    const editor = screen.getByTestId('mock-quill-editor');
    fireEvent.change(editor, { target: { value: '<p>Changed content</p>' } });
    
    await waitFor(() => {
      expect(mockAutosave).toHaveBeenCalledWith('<p>Changed content</p>');
    }, { timeout: 200 });
  });
}); 