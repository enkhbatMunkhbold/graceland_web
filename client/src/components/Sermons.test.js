import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import { api } from '../services/api';
import Sermons from './Sermons';

describe('Sermons latest YouTube player', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('shows the newest video preview and plays it in the main window', async () => {
    const latestVideo = {
      id: 'latest-video-id',
      title: 'Newest YouTube Upload',
      thumbnail_url: 'https://i.ytimg.com/vi/latest-video-id/hqdefault.jpg',
      embed_url: 'https://www.youtube-nocookie.com/embed/latest-video-id',
      published_at: '2026-07-27T12:00:00Z',
    };

    jest.spyOn(api, 'getSermons').mockResolvedValue([]);
    jest.spyOn(api, 'getLatestYouTubeVideos').mockResolvedValue([latestVideo]);

    render(
      <LanguageProvider>
        <Sermons />
      </LanguageProvider>
    );

    const playButton = await screen.findByRole('button', {
      name: `Play video: ${latestVideo.title}`,
    });
    expect(playButton.querySelector('img')).not.toBeNull();

    fireEvent.click(playButton);

    await waitFor(() => {
      const player = screen.getByTitle(latestVideo.title);
      expect(player.getAttribute('src')).toBe(
        `${latestVideo.embed_url}?autoplay=1&rel=0`
      );
    });
  });

  test('plays a selected gallery video in the main window without a modal', async () => {
    const videos = [
      {
        id: 'latest-video-id',
        title: 'Newest YouTube Upload',
        thumbnail_url: 'https://i.ytimg.com/vi/latest-video-id/hqdefault.jpg',
        embed_url: 'https://www.youtube-nocookie.com/embed/latest-video-id',
        published_at: '2026-07-27T12:00:00Z',
      },
      {
        id: 'second-video-id',
        title: 'Second YouTube Upload',
        thumbnail_url: 'https://i.ytimg.com/vi/second-video-id/hqdefault.jpg',
        embed_url: 'https://www.youtube-nocookie.com/embed/second-video-id',
        published_at: '2026-07-20T12:00:00Z',
      },
    ];

    jest.spyOn(api, 'getSermons').mockResolvedValue([]);
    jest.spyOn(api, 'getLatestYouTubeVideos').mockResolvedValue(videos);
    window.scrollTo = jest.fn();

    render(
      <LanguageProvider>
        <Sermons />
      </LanguageProvider>
    );

    fireEvent.click(await screen.findByRole('button', {
      name: `Play video: ${videos[1].title}`,
    }));

    await waitFor(() => {
      const player = screen.getByTitle(videos[1].title);
      expect(player.getAttribute('src')).toBe(
        `${videos[1].embed_url}?autoplay=1&rel=0`
      );
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
