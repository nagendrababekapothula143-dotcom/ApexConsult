import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api, { getAvatarSource } from '../../services/api';
import ResumeGenerator from '../../components/ResumeGenerator';

const StudentProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    university: '',
    major: '',
    location: '',
    linkedinUrl: '',
    portfolioUrl: '',
    education: [],
    experience: [],
    projects: [],
    technicalSkills: [],
    softSkills: [],
    avatarBase64: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    document.title = 'My Profile | Student Console';
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        university: user.university || '',
        major: user.major || '',
        location: user.location || '',
        linkedinUrl: user.linkedinUrl || '',
        portfolioUrl: user.portfolioUrl || '',
        education: user.education || [],
        experience: user.experience || [],
        projects: user.projects || [],
        technicalSkills: user.technicalSkills || [],
        softSkills: user.softSkills || [],
        avatarBase64: null
      });
      if (!formData.avatarBase64 && user.avatarUrl) {
        setAvatarPreview(getAvatarSource(user.avatarUrl));
      }
    }
  }, [user]);

  if (!user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    const updatedArray = [...formData[arrayName]];
    updatedArray[index] = { ...updatedArray[index], [field]: value };
    setFormData({ ...formData, [arrayName]: updatedArray });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAlert({ type: 'error', text: 'Image size must be less than 2MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setFormData(prev => ({ ...prev, avatarBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addArrayItem = (arrayName, emptyItem) => {
    setFormData({ ...formData, [arrayName]: [...formData[arrayName], emptyItem] });
  };

  const removeArrayItem = (arrayName, index) => {
    const updatedArray = formData[arrayName].filter((_, i) => i !== index);
    setFormData({ ...formData, [arrayName]: updatedArray });
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !formData.technicalSkills.includes(val)) {
        setFormData({ ...formData, technicalSkills: [...formData.technicalSkills, val] });
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      technicalSkills: formData.technicalSkills.filter(s => s !== skillToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    try {
      const res = await api.patch(`/auth/profile/${user._id || user.id}`, formData);
      if (res.data.success) {
        setAlert({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
        // Update user context so top navbar and other places reflect the new name
        setUser({ ...user, ...formData });
        setTimeout(() => setAlert(null), 3000);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile.';
      setAlert({ type: 'error', text: `Error: ${errorMessage}` });
    } finally {
      setSaving(false);
    }
  };

  const calculateProfileStrength = () => {
    if (!user) return 0;
    const fields = ['phone', 'university', 'major', 'location', 'linkedinUrl', 'avatarUrl'];
    const filled = fields.filter(f => user[f]).length;
    let score = (filled / fields.length) * 40;
    
    if (user.education?.length > 0) score += 20;
    if (user.experience?.length > 0) score += 20;
    if (user.technicalSkills?.length > 0) score += 20;
    
    return Math.min(Math.round(score), 100);
  };
  
  const profileStrength = calculateProfileStrength();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">My Profile</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your personal and academic information.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:border-indigo-200 transition-colors">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Profile Strength</p>
            <p className="text-sm font-black text-slate-900">{profileStrength}% Complete</p>
          </div>
          <div className="relative w-10 h-10 shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className={`${profileStrength === 100 ? 'text-emerald-500' : 'text-indigo-500'} drop-shadow-sm`} strokeDasharray={`${profileStrength}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {profileStrength === 100 ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <span className="text-[10px] font-black text-indigo-600">{profileStrength}%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {alert && alert.type === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          {alert.text}
        </div>
      )}
      
      {alert && alert.type === 'error' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
          {alert.text}
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-6">
            {isEditing ? (
              <div className="relative group cursor-pointer shrink-0">
                <div className="w-20 h-20 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600 uppercase overflow-hidden relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      {(() => {
                        const parts = (user?.name || 'S').trim().split(' ').filter(Boolean);
                        if (parts.length === 0) return 'S';
                        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                      })()}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-[10px] font-semibold">UPLOAD</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600 uppercase overflow-hidden shrink-0">
                {user.avatarUrl && !user.avatarUrl.includes('ui-avatars') ? (
                  <img src={getAvatarSource(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>
                    {(() => {
                      const parts = (user?.name || 'S').trim().split(' ').filter(Boolean);
                      if (parts.length === 0) return 'S';
                      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                    })()}
                  </span>
                )}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">{user.name}</h2>
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 inline-block">
                {user.role}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <ResumeGenerator user={user} />
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm px-5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-sm cursor-pointer"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 font-semibold cursor-not-allowed" title="Email cannot be changed">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="E.g., New York, NY"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Technical Skills (Press Enter or Comma to add)
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[50px] flex flex-wrap gap-2 items-center focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                  {formData.technicalSkills.map((skill, index) => (
                    <span key={index} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => removeSkill(skill)}
                        className="text-indigo-400 hover:text-indigo-600 border-none bg-transparent cursor-pointer ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder={formData.technicalSkills.length === 0 ? "E.g., Python, SQL, React, AWS" : ""}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Experience Array Editor */}
              <div className="md:col-span-2 mt-4 border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Experience / Internships
                  </label>
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('experience', { title: '', company: '', startDate: '', endDate: '', location: '', description: [''] })}
                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
                  >
                    + Add Experience
                  </button>
                </div>
                
                {formData.experience.map((exp, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 relative">
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('experience', index)}
                      className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border-none cursor-pointer transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Job Title / Role</label>
                        <input
                          type="text"
                          value={exp.title || ''}
                          onChange={(e) => handleArrayChange('experience', index, 'title', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="Software Engineer Intern"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Company</label>
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="Google"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate || ''}
                          onChange={(e) => handleArrayChange('experience', index, 'startDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="May 2025"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">End Date (Leave blank if present)</label>
                        <input
                          type="text"
                          value={exp.endDate || ''}
                          onChange={(e) => handleArrayChange('experience', index, 'endDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="Aug 2025"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Description / Bullet Points (Separate by new line)</label>
                        <textarea
                          value={exp.description ? exp.description.join('\n') : ''}
                          onChange={(e) => handleArrayChange('experience', index, 'description', e.target.value.split('\n'))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none h-24"
                          placeholder="• Developed new features...&#10;• Improved latency by 15%..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.experience.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No experience added yet.</p>
                )}
              </div>

              {/* Education Array Editor */}
              <div className="md:col-span-2 mt-4 border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Education History
                  </label>
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('education', { degree: '', university: '', startDate: '', endDate: '', gpa: '' })}
                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
                  >
                    + Add Education
                  </button>
                </div>
                
                {formData.education.map((edu, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 relative">
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('education', index)}
                      className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border-none cursor-pointer transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Degree / Course</label>
                        <input
                          type="text"
                          value={edu.degree || ''}
                          onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="B.Tech Computer Science"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">University / Board</label>
                        <input
                          type="text"
                          value={edu.university || ''}
                          onChange={(e) => handleArrayChange('education', index, 'university', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="Stanford University"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">GPA / Percentage</label>
                        <input
                          type="text"
                          value={edu.gpa || ''}
                          onChange={(e) => handleArrayChange('education', index, 'gpa', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="3.8 / 95%"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Graduation Date</label>
                        <input
                          type="text"
                          value={edu.endDate || ''}
                          onChange={(e) => handleArrayChange('education', index, 'endDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="May 2026"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.education.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No additional education added yet.</p>
                )}
              </div>

              {/* Projects Array Editor */}
              <div className="md:col-span-2 mt-4 border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Academic Projects
                  </label>
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('projects', { name: '', technologies: [], description: [''] })}
                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
                  >
                    + Add Project
                  </button>
                </div>
                
                {formData.projects.map((proj, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 relative">
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('projects', index)}
                      className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border-none cursor-pointer transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Project Name</label>
                        <input
                          type="text"
                          value={proj.name || ''}
                          onChange={(e) => handleArrayChange('projects', index, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="E-commerce Web App"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Technologies Used (Comma separated)</label>
                        <input
                          type="text"
                          value={proj.technologies ? proj.technologies.join(', ') : ''}
                          onChange={(e) => handleArrayChange('projects', index, 'technologies', e.target.value.split(',').map(s => s.trim()))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          placeholder="React, Node.js, MongoDB"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Description (Separate by new line)</label>
                        <textarea
                          value={proj.description ? proj.description.join('\n') : ''}
                          onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value.split('\n'))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none h-24"
                          placeholder="Built a full stack app...&#10;Integrated Stripe..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.projects.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No projects added yet.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer border-none disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold">
                  {user.name}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold">
                  {user.phone || <span className="text-slate-400 italic">Not provided</span>}
                </div>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Location
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold">
                  {user.location || <span className="text-slate-400 italic">Not provided</span>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  LinkedIn URL
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold break-all">
                  {user.linkedinUrl ? (
                    <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {user.linkedinUrl}
                    </a>
                  ) : <span className="text-slate-400 italic">Not provided</span>}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Technical Skills
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[46px] flex flex-wrap gap-2">
                  {user.technicalSkills && user.technicalSkills.length > 0 ? (
                    user.technicalSkills.map((skill, idx) => (
                      <span key={idx} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold">
                        {skill}
                      </span>
                    ))
                  ) : <span className="text-slate-400 italic text-sm font-semibold">Not provided</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
