const util = {
  renderCompareTo: function(ra, filename, success) {
    ra.show(null, ensureImageMatch(filename, success));
    ra._display._hasDocumentBody = true;
  }
};
