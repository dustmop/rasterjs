const util = {
  renderCompareTo: function(ra, filename, success) {
    ra.show(null, ensureImageMatch(filename, success));
    ra.scene.display._hasDocumentBody = true;
  }
};
