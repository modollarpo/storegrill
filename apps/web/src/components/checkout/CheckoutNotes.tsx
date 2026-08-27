export function CheckoutNotes({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-gray-900 mb-4">Order Notes (Optional)</h2>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Add special instructions for your delivery..."
        className="w-full h-24 p-3 text-sm border-gray-300 rounded-md focus:border-[#0071DC] bg-gray-50"
      />
    </div>
  );
}
