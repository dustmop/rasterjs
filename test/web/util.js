const util = {
  renderCompareTo: function(ra, filename, success) {
    ra.setNumFrames(1);
    ra.run(null, {postRun: () => {
      ensureImageMatch(filename, success);
    }});
    ra._display._hasDocumentBody = true;
  }
};
