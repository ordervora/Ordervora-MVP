import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#F7F0E5] px-4 py-8 text-[#171512] sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight text-[#B97824]">OrderVora</div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#756B5D] shadow-sm">Auth 2.0</span>
        </div>

        <section className="rounded-[28px] border border-[#E7DDCF] bg-white p-5 shadow-[0_18px_50px_rgba(48,39,27,0.07)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">PASSWORD RECOVERY</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Reset password is next.</h1>
          <p className="mt-3 text-sm leading-6 text-[#756B5D]">
            The recovery screen is ready, but email reset delivery still needs the SMTP verification flow to be connected.
          </p>
          <Link href="/login" className="mt-7 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#171512] px-5 text-base font-bold text-white shadow-lg shadow-black/10">
            Back to login
          </Link>
        </section>
      </div>
    </main>
  );
}
