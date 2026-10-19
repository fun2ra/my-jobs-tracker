import { useAuth } from './hooks/useAuth';
import { useJobs } from './hooks/useJobs';
import { config, missingConfig } from './lib/config';
import Header from './layout/header';
import SideBar from './layout/sideBar';
import Footer from './layout/footer';
import MissingConfig from './components/MissingConfig';
import Authentication from './components/Authentication';
import MainDashboard from './components/MainDashboard';

export function App() {
  const auth = useAuth(config);
  // One instance for the whole app, so an update started in the header shows in the dashboard.
  const jobs = useJobs();

  if (missingConfig.length) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <MissingConfig missingConfig={missingConfig} />
      </div>
    );
  }

  if (!auth.session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <Authentication error={auth.error} signIn={auth.signIn} signingIn={auth.signingIn} />
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SideBar email={auth.session.email} signOut={auth.signOut} />
      <div className="flex min-h-screen flex-col pl-56">
        <Header session={auth.session} jobs={jobs} />
        <MainDashboard jobs={jobs} />
      </div>
    </>
  );
}
