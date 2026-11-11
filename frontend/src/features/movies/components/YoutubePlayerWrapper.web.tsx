// Nguyễn Minh Quân - CE180048
import React, { useEffect } from 'react';
import { View } from 'react-native';

interface YoutubePlayerProps {
  height: number;
  width: number;
  videoId: string;
  play?: boolean;
  onChangeState?: (state: string) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
  allowWebViewZoom?: boolean;
  initialPlayerParams?: any;
}

export default function YoutubePlayerWeb({
  height,
  width,
  videoId,
  play = false,
  onReady,
}: YoutubePlayerProps) {
  useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  const autoplayParam = play ? '1' : '0';
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(
    videoId
  )}?autoplay=${autoplayParam}&rel=0&modestbranding=1&enablejsapi=1`;

  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: '#000000' }}>
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 'none', width: '100%', height: '100%' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube Trailer"
      />
    </View>
  );
}
