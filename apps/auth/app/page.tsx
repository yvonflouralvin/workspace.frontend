import {
  ArrowForward,
  Visibility,
  Lock,
  AlternateEmail
} from "@mui/icons-material"

import Image from 'next/image'

export default function Home() {
  return (<div className="bg-primary">
    <main className="flex min-h-screen w-full">
      {/* <!-- Left Side: Brand Marketing --> */}
      <section className="hidden lg:flex w-1/2 mesh-gradient relative overflow-hidden flex-col justify-between p-xl">
        <div className="grain-overlay absolute inset-0 pointer-events-none"></div>
        {/* <!-- Logo Area --> */}
        <div className="relative z-10">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center shadow-lg">
              <Image src="/SaaSLogo.png" alt="Logo" width={100} height={100} />
              {/* <span className="material-symbols-outlined text-primary text-[28px]" data-weight="fill">hub</span> */}
            </div>
            <span className="font-display text-headline-sm text-white font-bold tracking-tight">Workspace</span>
          </div>
        </div>
        {/* <!-- Marketing Content --> */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-md">
            <span className="flex h-2 w-2 rounded-full bg-secondary-fixed"></span>
            <span className="font-label-sm text-label-sm text-white uppercase tracking-wider">Enterprise Ready</span>
          </div>
          <h1 className="font-display text-display text-white mb-md leading-tight">
            Built for Scale.<br />Designed for Speed.
          </h1>
          <p className="font-body-lg text-body-lg text-white/80 leading-relaxed mb-xl">
            Experience the next generation of collaborative productivity. Imani Workspace integrates high-performance tools with a minimalist interface to keep your team in the flow.
          </p>
          {/* <!-- Feature Grid (Subtle) --> */}
          <div className="grid grid-cols-2 gap-lg border-t border-white/10 pt-xl">
            <div>
              <span className="block font-display text-headline-sm text-white font-bold">99.9%</span>
              <span className="font-label-md text-label-md text-white/60">Uptime Reliability</span>
            </div>
            <div>
              <span className="block font-display text-headline-sm text-white font-bold">256-bit</span>
              <span className="font-label-md text-label-md text-white/60">AES Encryption</span>
            </div>
          </div>
        </div>
        {/* <!-- Visual Decorative Element (Mock UI Component) --> */}
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[400px] bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-2xl rotate-12 flex flex-col p-md shadow-2xl">
          <div className="flex gap-2 mb-md">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
          </div>
          <div className="space-y-sm">
            <div className="h-4 w-3/4 bg-white/10 rounded"></div>
            <div className="h-4 w-1/2 bg-white/10 rounded"></div>
            <div className="grid grid-cols-3 gap-sm pt-md">
              <div className="h-20 bg-white/5 rounded-lg border border-white/10"></div>
              <div className="h-20 bg-white/5 rounded-lg border border-white/10"></div>
              <div className="h-20 bg-white/5 rounded-lg border border-white/10"></div>
            </div>
          </div>
        </div>
        {/* <!-- Footer Attribution --> */}
        <div className="relative z-10">
          <p className="font-label-sm text-label-sm text-white/50">
            © 2026 SAAS Workspace Inc. All rights reserved.
          </p>
        </div>
      </section>
      {/* <!-- Right Side: Login Form --> */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-md relative">
        {/* <!-- Mobile Logo Only --> */}
        <div className="absolute top-md left-md lg:hidden flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-[32px]">hub</span>
          <span className="font-display text-headline-sm text-on-surface font-bold">Imani</span>
        </div>
        <div className="w-full max-w-[420px] space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* <!-- Header --> */}
          <div className="space-y-sm">
            <h2 className="font-display text-headline-lg text-on-surface tracking-tight">Welcome back</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Enter your credentials to access your workspace.</p>
          </div>
          {/* <!-- Form --> */}
          <form className="space-y-lg" id="loginForm">
            {/* <!-- Email Field --> */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="email">Work Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AlternateEmail />
                </div>
                <input className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant" id="email" name="email" placeholder="name@company.com" type="email" />
              </div>
            </div>
            {/* <!-- Password Field --> 
            <div className="space-y-xs">
              <div className="flex justify-between items-center px-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">Password</label>
                <a className="font-label-md text-label-md text-primary hover:underline transition-all" href="#">Forgot Password?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock /> 
                </div>
                <input className="w-full pl-10 pr-12 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant" id="password" name="password" placeholder="••••••••" type="password" />
                <button className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface-variant transition-colors" type="button">
                  <Visibility /> 
                </button>
              </div>
            </div>
            */}
            {/* <!-- Remember Me --> 
            <div className="flex items-center">
              <input className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary/20 transition-all cursor-pointer" id="remember" name="remember" type="checkbox" />
              <label className="ml-2 font-label-md text-label-md text-on-surface-variant cursor-pointer select-none" htmlFor="remember">
                Keep me logged in for 30 days
              </label>
            </div>
            */}
            {/* <!-- Submit Button --> */}
            <button className="w-full py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2" type="submit">
              Sign In
              <ArrowForward />
            </button>
          </form>
          {/* <!-- Separator --> */}
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center text-label-sm">
              <span className="px-3 bg-surface-container-lowest text-outline font-label-sm uppercase tracking-widest">Or continue with</span>
            </div>
          </div>
          {/* <!-- SSO Buttons --> */}
          <div className="grid grid-cols-2 gap-md">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors duration-100">
              <img alt="Google Logo" className="w-4 h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqDt9ryTYR0YwXJT7pRy6IKe0evueOSLZxzw3m97qgWXqTbAFUyTCgngqpBUlJylm5_ItF4PrhxVPONHIzLXwNs9Rsv4nVo9YCcwarLldDs4Ue_ttWFK9rV5BLj3FC3oqTAIL3Wx3KoCKw5_mjV6XJuZdCoiXqnVz0O-p5IzzEatEPibHPqK0OluymnMME3g0Qzm8cSMs4GFDeCcJOZPfgbdEcxMKEbfP6KuckgWF1_VVU0ONSxKEoNje2nRQFRhrM4DcS0DrZJIpk" />
              <span className="font-label-md text-label-md text-on-surface">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors duration-100">
              <span className="material-symbols-outlined text-[20px] text-on-surface">terminal</span>
              <span className="font-label-md text-label-md text-on-surface">SSO</span>
            </button>
          </div>
          {/* <!-- Footer Link --> */}
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Don't have an account?
            <a className="text-primary font-semibold hover:underline" href="#">Request Access</a>
          </p>
        </div>
        {/* <!-- Bottom Legal for Right Side (Mobile) --> */}
        <div className="absolute bottom-md text-center w-full lg:hidden">
          <p className="font-label-sm text-label-sm text-outline">
            © 2024 Imani Workspace Inc.
          </p>
        </div>
      </section>
    </main>
  </div>
  );
}


