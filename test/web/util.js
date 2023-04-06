const util = {
  renderCompareTo: function(ra, filename, success) {
    ra.setNumFrames(1);
    ra.run(null, {postRun: () => {
      ra.quit();
      ensureImageMatch(filename, success);
    }});
    ra.display._hasDocumentBody = true;
  }
};
