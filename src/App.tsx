import { useAuth } from './hooks/useAuth';
import { config } from './lib/config';
import { missingConfig } from '@/lib/config';
import Header from './layout/header';
import MissingConfig from './components/MissingConfig';
import Authentication from './components/Authentication';
import MainDashboard from './components/MainDashboard';
import Footer from './layout/footer';

/**
 * Bare placeholder UI: it shows how the hooks fit together and is meant to be replaced by the
 * real design. All the logic is in hooks/useAuth.ts and hooks/useJobs.ts.
 */

const renderContent = () => {
  const auth = useAuth(config);
  const { session } = auth;

  if (missingConfig.length) {
    <MissingConfig missingConfig={missingConfig} />
  }

  if (!auth.session) {
    return (
      <Authentication error={auth.error} signIn={auth.signIn} signingIn={auth.signingIn} />
    );
  }

  return (
    <MainDashboard session={session} signOut={auth.signOut} />
  )
}

export function App() {
  return (<>
    <Header />
    {renderContent()}
    <Footer />
  </>)
}
