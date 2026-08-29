export function CheckoutNotes({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-text-primary mb-4">Order Notes (Optional)</h2>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Add special instructions for your delivery..."
        className="w-full h-24 p-3 text-sm border-border rounded-md focus:border-ember bg-surface-sunken"
      />
    </div>
  );
}
