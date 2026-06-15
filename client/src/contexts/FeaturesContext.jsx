import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const defaultFeatures = { googleAuth: false, captcha: false, discordStorage: false };
const FeaturesContext = createContext({ features: defaultFeatures, loading: true });

export const FeaturesProvider = ({ children }) => {
  const [features, setFeatures] = useState(defaultFeatures);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/config')
      .then((res) => setFeatures(res.data?.data?.features || defaultFeatures))
      .catch(() => setFeatures(defaultFeatures))
      .finally(() => setLoading(false));
  }, []);

  return (
    <FeaturesContext.Provider value={{ features, loading }}>
      {children}
    </FeaturesContext.Provider>
  );
};

export const useFeatures = () => useContext(FeaturesContext);
