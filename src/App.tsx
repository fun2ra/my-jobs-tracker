import { useAuth } from './hooks/useAuth';
import { config } from './lib/config';
import { missingConfig } from '@/lib/config';
import Header from './layout/header';
import MissingConfig from './components/MissingConfig';
import Authentication from './components/Authentication';
import MainDashboard from './components/MainDashboard';
import Footer from './layout/footer';


const renderContent = (auth: ReturnType<typeof useAuth>) => {
  if (missingConfig.length) {
    return <MissingConfig missingConfig={missingConfig} />;
  }

  if (!auth.session) {
    return (
      <>
        <Authentication error={auth.error} signIn={auth.signIn} signingIn={auth.signingIn} />
        <Footer />
      </>
    );
  }

  return <MainDashboard session={auth.session} signOut={auth.signOut} />;
};

export function App() {
  const auth = useAuth(config);

  return (
    <>
      <Header session={auth.session} />
      {renderContent(auth)}
    </>
  );
}
