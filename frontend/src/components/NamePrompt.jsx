
export default function NamePrompt({ onSubmit }) {
  return (
    <div className="flex flex-col items-center mt-40">
      <h2 className="text-xl font-semibold mb-4">
        Enter your name
      </h2>

      <input
        className="border p-2 rounded w-64 mb-4"
        placeholder="Your name"
        onChange={(e) => onSubmit(e.target.value, false)}
      />
    </div>
  );
}
