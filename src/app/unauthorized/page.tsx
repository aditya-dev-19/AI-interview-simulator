export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500">401</h1>
        <p className="mt-4 text-xl">Unauthorized</p>
        <p className="text-zinc-400 mt-2">
          You do not have permission to access this page.
        </p>
      </div>
    </div>
  );
}